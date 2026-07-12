use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshot {
    pub checked_at: String,
    pub source: String,
    pub stale: bool,
    pub account: Option<AccountSnapshot>,
    pub limits: UsageLimits,
    pub credits: Option<CreditSnapshot>,
    pub error: Option<UsageError>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSnapshot {
    pub email: Option<String>,
    pub plan: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageLimits {
    pub five_hour: Option<WindowSnapshot>,
    pub weekly: Option<WindowSnapshot>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowSnapshot {
    pub used_percent: f64,
    pub remaining_percent: f64,
    pub window_minutes: i64,
    pub resets_at: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditSnapshot {
    pub has_credits: bool,
    pub unlimited: bool,
    pub balance: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageError {
    pub code: String,
    pub message: String,
}

impl UsageSnapshot {
    pub fn empty_with_error(error: UsageError) -> Self {
        Self {
            checked_at: chrono::Utc::now().to_rfc3339(),
            source: "none".into(),
            stale: true,
            account: None,
            limits: UsageLimits::default(),
            credits: None,
            error: Some(error),
        }
    }
}
