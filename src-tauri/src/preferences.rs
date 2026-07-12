use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::storage;

const REFRESH_INTERVALS: [u64; 4] = [30_000, 60_000, 120_000, 300_000];

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TimeDisplayMode {
    #[default]
    Remaining,
    Exact,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    #[serde(default = "default_floating")]
    pub floating: bool,
    #[serde(default = "default_refresh_interval")]
    pub refresh_interval: u64,
    #[serde(default)]
    pub time_display_mode: TimeDisplayMode,
    #[serde(default)]
    pub theme: ThemeMode,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiPreferences {
    refresh_interval: u64,
    time_display_mode: TimeDisplayMode,
    theme: ThemeMode,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            floating: default_floating(),
            refresh_interval: default_refresh_interval(),
            time_display_mode: TimeDisplayMode::default(),
            theme: ThemeMode::default(),
        }
    }
}

impl Preferences {
    pub fn update_ui(&mut self, update: UiPreferences) -> Result<(), String> {
        if !REFRESH_INTERVALS.contains(&update.refresh_interval) {
            return Err("不支持的刷新频率".to_string());
        }

        self.refresh_interval = update.refresh_interval;
        self.time_display_mode = update.time_display_mode;
        self.theme = update.theme;
        Ok(())
    }

    fn normalized(mut self) -> Self {
        if !REFRESH_INTERVALS.contains(&self.refresh_interval) {
            self.refresh_interval = default_refresh_interval();
        }
        self
    }
}

pub fn read(app: &AppHandle) -> Preferences {
    preference_path(app)
        .as_deref()
        .and_then(storage::read_json)
        .map(Preferences::normalized)
        .unwrap_or_default()
}

pub fn write(app: &AppHandle, preferences: &Preferences) -> Result<(), String> {
    let path = preference_path(app).ok_or_else(|| "无法确定应用配置目录".to_string())?;
    storage::write_json_atomic(&path, preferences).map_err(|error| error.to_string())
}

fn preference_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|directory| directory.join("preferences.json"))
}

const fn default_floating() -> bool {
    true
}

const fn default_refresh_interval() -> u64 {
    60_000
}

#[cfg(test)]
mod tests {
    use super::{Preferences, ThemeMode, TimeDisplayMode, UiPreferences};

    #[test]
    fn fills_defaults_for_older_preference_files() {
        let preferences: Preferences = serde_json::from_str("{}").expect("fixture should parse");

        assert!(preferences.floating);
        assert_eq!(preferences.refresh_interval, 60_000);
        assert_eq!(preferences.time_display_mode, TimeDisplayMode::Remaining);
        assert_eq!(preferences.theme, ThemeMode::System);
    }

    #[test]
    fn validates_refresh_interval_updates() {
        let mut preferences = Preferences::default();
        let result = preferences.update_ui(UiPreferences {
            refresh_interval: 42,
            time_display_mode: TimeDisplayMode::Exact,
            theme: ThemeMode::Dark,
        });

        assert!(result.is_err());
        assert_eq!(preferences.refresh_interval, 60_000);
    }

    #[test]
    fn keeps_floating_when_ui_preferences_change() {
        let mut preferences = Preferences {
            floating: false,
            ..Preferences::default()
        };

        preferences
            .update_ui(UiPreferences {
                refresh_interval: 120_000,
                time_display_mode: TimeDisplayMode::Exact,
                theme: ThemeMode::Light,
            })
            .expect("supported preferences should update");

        assert!(!preferences.floating);
        assert_eq!(preferences.refresh_interval, 120_000);
        assert_eq!(preferences.theme, ThemeMode::Light);
    }
}
