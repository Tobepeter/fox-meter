mod auth;
mod models;
mod preferences;
mod storage;
mod usage;

use std::{sync::Mutex, thread, time::Duration};

use models::{UsageError, UsageSnapshot};
use reqwest::Client;
use serde::Serialize;
use tauri::{Emitter, Manager, RunEvent, State, WebviewWindow, WindowEvent};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

struct AppState {
    client: Client,
    preferences: Mutex<preferences::Preferences>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FloatingState {
    floating: bool,
    pause: Option<preferences::FloatingPause>,
}

#[tauri::command]
async fn refresh_usage(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<UsageSnapshot, String> {
    let result = match auth::read_credentials() {
        Ok(credentials) => usage::fetch_usage(&state.client, credentials).await,
        Err(error) => Err(error),
    };

    match result {
        Ok(snapshot) => {
            usage::write_cache(&app, &snapshot);
            Ok(snapshot)
        }
        Err(error) => Ok(stale_snapshot(&app, error)),
    }
}

#[tauri::command]
fn read_cached_usage(app: tauri::AppHandle) -> Option<UsageSnapshot> {
    usage::read_cache(&app).map(|mut snapshot| {
        snapshot.stale = true;
        snapshot.source = "cache".into();
        snapshot
    })
}

#[tauri::command]
fn get_floating_state(state: State<'_, AppState>) -> FloatingState {
    let preferences = state
        .preferences
        .lock()
        .unwrap_or_else(|lock| lock.into_inner());
    floating_state(&preferences)
}

#[tauri::command]
fn get_preferences(state: State<'_, AppState>) -> preferences::Preferences {
    state
        .preferences
        .lock()
        .unwrap_or_else(|lock| lock.into_inner())
        .clone()
}

#[tauri::command]
fn set_preferences(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    preferences: preferences::UiPreferences,
) -> Result<preferences::Preferences, String> {
    let mut current = state
        .preferences
        .lock()
        .unwrap_or_else(|lock| lock.into_inner());
    let previous = current.clone();
    current.update_ui(preferences)?;

    if let Err(error) = preferences::write(&app, &current) {
        *current = previous;
        return Err(error);
    }

    Ok(current.clone())
}

#[tauri::command]
fn set_floating(
    app: tauri::AppHandle,
    window: WebviewWindow,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<FloatingState, String> {
    let mut preferences = state
        .preferences
        .lock()
        .unwrap_or_else(|lock| lock.into_inner());
    if preferences.floating == enabled && preferences.floating_pause.is_none() {
        return Ok(floating_state(&preferences));
    }

    let previous = preferences.clone();
    set_window_floating(&window, enabled)?;
    preferences.floating = enabled;
    preferences.floating_pause = None;
    if let Err(error) = preferences::write(&app, &preferences) {
        *preferences = previous.clone();
        let _ = set_window_floating(&window, previous.floating);
        return Err(error);
    }

    Ok(floating_state(&preferences))
}

#[tauri::command]
fn pause_floating(
    app: tauri::AppHandle,
    window: WebviewWindow,
    state: State<'_, AppState>,
    preset: preferences::FloatingPausePreset,
) -> Result<FloatingState, String> {
    let pause = preferences::FloatingPause::from_preset(preset)?;
    let mut preferences = state
        .preferences
        .lock()
        .unwrap_or_else(|lock| lock.into_inner());
    let previous = preferences.clone();

    set_window_floating(&window, false)?;
    preferences.floating = false;
    preferences.floating_pause = Some(pause.clone());
    if let Err(error) = preferences::write(&app, &preferences) {
        *preferences = previous.clone();
        let _ = set_window_floating(&window, previous.floating);
        return Err(error);
    }

    let next = floating_state(&preferences);
    drop(preferences);
    schedule_floating_resume(app, pause);
    Ok(next)
}

#[tauri::command]
fn start_window_drag(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|error| error.to_string())
}

#[tauri::command]
async fn set_window_mode(
    window: WebviewWindow,
    mini: bool,
    mini_size: f64,
    animated: bool,
) -> Result<(), String> {
    if !(44.0..=80.0).contains(&mini_size) {
        return Err("Mini window size must be between 44 and 80".into());
    }

    if mini {
        set_window_controls_visible(&window, false)?;
        #[cfg(target_os = "macos")]
        window
            .set_shadow(false)
            .map_err(|error| error.to_string())?;
    }

    let (target_width, target_height) = if mini {
        (mini_size, mini_size)
    } else {
        (320.0, 184.0)
    };
    animate_window_size(window.clone(), target_width, target_height, animated).await?;

    if !mini {
        #[cfg(target_os = "macos")]
        window.set_shadow(true).map_err(|error| error.to_string())?;
        set_window_controls_visible(&window, true)?;
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn set_window_controls_visible(window: &WebviewWindow, visible: bool) -> Result<(), String> {
    use objc2_app_kit::{NSWindow, NSWindowButton};

    let ns_window = window.ns_window().map_err(|error| error.to_string())? as usize;
    window
        .run_on_main_thread(move || {
            // 保留 Overlay 窗口结构，只切换三个原生按钮
            let ns_window = unsafe { &*(ns_window as *const NSWindow) };
            for kind in [
                NSWindowButton::CloseButton,
                NSWindowButton::MiniaturizeButton,
                NSWindowButton::ZoomButton,
            ] {
                if let Some(button) = ns_window.standardWindowButton(kind) {
                    button.setHidden(!visible);
                }
            }
        })
        .map_err(|error| error.to_string())
}

#[cfg(not(target_os = "macos"))]
fn set_window_controls_visible(window: &WebviewWindow, visible: bool) -> Result<(), String> {
    window
        .set_decorations(visible)
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
async fn animate_window_size(
    window: WebviewWindow,
    target_width: f64,
    target_height: f64,
    animated: bool,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        animate_window_size_blocking(&window, target_width, target_height, animated)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(target_os = "macos")]
fn animate_window_size_blocking(
    window: &WebviewWindow,
    target_width: f64,
    target_height: f64,
    animated: bool,
) -> Result<(), String> {
    use std::ptr::NonNull;

    use block2::RcBlock;
    use objc2_app_kit::{NSAnimatablePropertyContainer, NSAnimationContext, NSWindow};

    let ns_window = window.ns_window().map_err(|error| error.to_string())? as usize;
    let (completed_tx, completed_rx) = std::sync::mpsc::sync_channel(1);
    window
        .run_on_main_thread(move || {
            let ns_window = unsafe { &*(ns_window as *const NSWindow) };
            let current_frame = ns_window.frame();
            let mut target_frame = current_frame;

            // AppKit 以左下角为原点，补偿 y 以固定窗口左上角
            target_frame.origin.y += current_frame.size.height - target_height;
            target_frame.size.width = target_width;
            target_frame.size.height = target_height;

            if !animated {
                ns_window.setFrame_display(target_frame, true);
                let _ = completed_tx.send(());
                return;
            }

            let changes: RcBlock<dyn Fn(NonNull<NSAnimationContext>)> =
                RcBlock::new(move |context: NonNull<NSAnimationContext>| {
                    let context = unsafe { context.as_ref() };
                    context.setDuration(0.24);
                    context.setAllowsImplicitAnimation(true);
                    ns_window.animator().setFrame_display(target_frame, true);
                });
            let completion: RcBlock<dyn Fn()> = RcBlock::new(move || {
                let _ = completed_tx.send(());
            });
            NSAnimationContext::runAnimationGroup_completionHandler(&changes, Some(&completion));
        })
        .map_err(|error| error.to_string())?;

    completed_rx
        .recv_timeout(Duration::from_secs(3))
        .map_err(|error| format!("Native window animation failed: {error}"))
}

#[cfg(not(target_os = "macos"))]
async fn animate_window_size(
    window: WebviewWindow,
    target_width: f64,
    target_height: f64,
    animated: bool,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        animate_window_size_blocking(&window, target_width, target_height, animated)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(not(target_os = "macos"))]
fn animate_window_size_blocking(
    window: &WebviewWindow,
    target_width: f64,
    target_height: f64,
    animated: bool,
) -> Result<(), String> {
    use tauri::LogicalSize;

    let scale_factor = window.scale_factor().map_err(|error| error.to_string())?;
    let current = window
        .inner_size()
        .map_err(|error| error.to_string())?
        .to_logical::<f64>(scale_factor);
    let steps = if animated { 14 } else { 1 };

    for step in 1..=steps {
        let progress = step as f64 / steps as f64;
        let eased = 1.0 - (1.0 - progress).powi(3);
        let width = current.width + (target_width - current.width) * eased;
        let height = current.height + (target_height - current.height) * eased;
        window
            .set_size(LogicalSize::new(width, height))
            .map_err(|error| error.to_string())?;
        if animated && step < steps {
            thread::sleep(Duration::from_millis(14));
        }
    }

    Ok(())
}

fn set_window_floating(window: &WebviewWindow, enabled: bool) -> Result<(), String> {
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())?;
    if let Err(error) = window.set_visible_on_all_workspaces(enabled) {
        let _ = window.set_always_on_top(!enabled);
        return Err(error.to_string());
    }
    Ok(())
}

fn floating_state(preferences: &preferences::Preferences) -> FloatingState {
    FloatingState {
        floating: preferences.floating,
        pause: preferences.floating_pause.clone(),
    }
}

fn schedule_floating_resume(app: tauri::AppHandle, pause: preferences::FloatingPause) {
    thread::spawn(move || {
        let delay = pause
            .resumes_at
            .saturating_sub(chrono::Utc::now().timestamp_millis())
            .max(0) as u64;
        thread::sleep(Duration::from_millis(delay));

        let state = app.state::<AppState>();
        let mut preferences = state
            .preferences
            .lock()
            .unwrap_or_else(|lock| lock.into_inner());
        if preferences.floating_pause.as_ref() != Some(&pause) {
            return;
        }

        let Some(window) = app.get_webview_window("main") else {
            return;
        };
        if set_window_floating(&window, true).is_err() {
            return;
        }

        let previous = preferences.clone();
        preferences.floating = true;
        preferences.floating_pause = None;
        if preferences::write(&app, &preferences).is_err() {
            *preferences = previous;
            let _ = set_window_floating(&window, false);
            return;
        }

        let next = floating_state(&preferences);
        drop(preferences);
        let _ = app.emit("floating-state", next);
    });
}

fn set_window_theme(window: &WebviewWindow, theme: preferences::ThemeMode) -> Result<(), String> {
    let theme = match theme {
        preferences::ThemeMode::System => None,
        preferences::ThemeMode::Light => Some(tauri::Theme::Light),
        preferences::ThemeMode::Dark => Some(tauri::Theme::Dark),
    };
    window.set_theme(theme).map_err(|error| error.to_string())
}

fn stale_snapshot(app: &tauri::AppHandle, error: UsageError) -> UsageSnapshot {
    usage::read_cache(app)
        .map(|mut snapshot| {
            snapshot.stale = true;
            snapshot.source = "cache".into();
            snapshot.error = Some(error.clone());
            snapshot
        })
        .unwrap_or_else(|| UsageSnapshot::empty_with_error(error))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .expect("HTTP client should initialize");
    let app =
        tauri::Builder::default()
            .plugin(
                tauri_plugin_window_state::Builder::default()
                    .with_state_flags(StateFlags::POSITION)
                    .build(),
            )
            .manage(AppState {
                client,
                preferences: Mutex::new(preferences::Preferences::default()),
            })
            .invoke_handler(tauri::generate_handler![
                refresh_usage,
                read_cached_usage,
                get_floating_state,
                get_preferences,
                set_preferences,
                set_floating,
                pause_floating,
                start_window_drag,
                set_window_mode
            ])
            .setup(|app| {
                if let Some(window) = app.get_webview_window("main") {
                    let mut preferences = preferences::read(app.handle());
                    if preferences.floating_pause.as_ref().is_some_and(|pause| {
                        pause.resumes_at <= chrono::Utc::now().timestamp_millis()
                    }) {
                        preferences.floating = true;
                        preferences.floating_pause = None;
                        let _ = preferences::write(app.handle(), &preferences);
                    }
                    set_window_theme(&window, preferences.theme)?;
                    set_window_floating(&window, preferences.floating)?;
                    *app.state::<AppState>()
                        .preferences
                        .lock()
                        .unwrap_or_else(|lock| lock.into_inner()) = preferences.clone();

                    if let Some(pause) = preferences.floating_pause {
                        schedule_floating_resume(app.handle().clone(), pause);
                    }

                    let close_window = window.clone();
                    let close_app = app.handle().clone();
                    window.on_window_event(move |event| {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let _ = close_app.save_window_state(StateFlags::POSITION);
                            let _ = close_window.emit("app-visibility", false);
                            let _ = close_window.hide();
                        }
                    });
                }
                Ok(())
            })
            .build(tauri::generate_context!())
            .expect("FoxMeter should initialize");

    app.run(|app_handle, event| {
        if let RunEvent::Reopen { .. } = event {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.emit("app-visibility", true);
            }
        }
    });
}
