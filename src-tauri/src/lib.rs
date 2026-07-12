mod auth;
mod models;
mod preferences;
mod storage;
mod usage;

use std::{sync::Mutex, time::Duration};

use models::{UsageError, UsageSnapshot};
use reqwest::Client;
use tauri::{Emitter, Manager, RunEvent, State, WebviewWindow, WindowEvent};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

struct AppState {
    client: Client,
    preferences: Mutex<preferences::Preferences>,
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
fn get_floating(state: State<'_, AppState>) -> bool {
    state
        .preferences
        .lock()
        .unwrap_or_else(|lock| lock.into_inner())
        .floating
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
) -> Result<(), String> {
    let mut preferences = state
        .preferences
        .lock()
        .unwrap_or_else(|lock| lock.into_inner());
    let previous = preferences.floating;
    if previous == enabled {
        return Ok(());
    }

    set_window_floating(&window, enabled)?;
    preferences.floating = enabled;
    if let Err(error) = preferences::write(&app, &preferences) {
        preferences.floating = previous;
        let _ = set_window_floating(&window, previous);
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
fn start_window_drag(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|error| error.to_string())
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
    let app = tauri::Builder::default()
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
            get_floating,
            get_preferences,
            set_preferences,
            set_floating,
            start_window_drag
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let preferences = preferences::read(app.handle());
                set_window_theme(&window, preferences.theme)?;
                set_window_floating(&window, preferences.floating)?;
                *app.state::<AppState>()
                    .preferences
                    .lock()
                    .unwrap_or_else(|lock| lock.into_inner()) = preferences;

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
