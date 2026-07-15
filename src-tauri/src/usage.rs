use std::path::PathBuf;

use reqwest::{header, Client, StatusCode};
use serde::Deserialize;
use tauri::{AppHandle, Manager};

use crate::{
    auth::CodexCredentials,
    models::{
        AccountSnapshot, CreditSnapshot, UsageError, UsageLimits, UsageSnapshot, WindowSnapshot,
    },
    storage,
};

const USAGE_URL: &str = "https://chatgpt.com/backend-api/wham/usage";

#[derive(Debug, Deserialize)]
struct CodexUsageResponse {
    plan_type: Option<String>,
    rate_limit: Option<RateLimitDetails>,
    credits: Option<CreditDetails>,
}

#[derive(Debug, Deserialize)]
struct RateLimitDetails {
    primary_window: Option<CodexWindow>,
    secondary_window: Option<CodexWindow>,
}

#[derive(Debug, Deserialize)]
struct CodexWindow {
    used_percent: f64,
    reset_at: i64,
    limit_window_seconds: i64,
}

#[derive(Debug, Deserialize)]
struct CreditDetails {
    #[serde(default)]
    has_credits: bool,
    #[serde(default)]
    unlimited: bool,
    #[serde(default, deserialize_with = "deserialize_optional_number")]
    balance: Option<f64>,
}

pub async fn fetch_usage(
    client: &Client,
    credentials: CodexCredentials,
) -> Result<UsageSnapshot, UsageError> {
    let mut request = client
        .get(USAGE_URL)
        .header(
            header::AUTHORIZATION,
            format!("Bearer {}", credentials.access_token),
        )
        .header(header::ACCEPT, "application/json")
        .header(
            header::USER_AGENT,
            concat!("FoxMeter/", env!("CARGO_PKG_VERSION")),
        );

    if let Some(account_id) = credentials.account_id.filter(|value| !value.is_empty()) {
        request = request.header("ChatGPT-Account-Id", account_id);
    }

    let response = request.send().await.map_err(|error| UsageError {
        code: "network".into(),
        message: format!("暂时无法连接 Codex usage 服务：{error}"),
    })?;
    let status = response.status();

    if let Some(error) = response_error(status) {
        return Err(error);
    }

    let response: CodexUsageResponse = response.json().await.map_err(|_| UsageError {
        code: "invalid-response".into(),
        message: "Codex usage 返回了无法识别的数据".into(),
    })?;

    Ok(snapshot_from_response(response, credentials.email))
}

fn response_error(status: StatusCode) -> Option<UsageError> {
    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        return Some(UsageError {
            code: "unauthorized".into(),
            message: "Codex 登录已失效，请重新执行 `codex login`".into(),
        });
    }
    if !status.is_success() {
        return Some(UsageError {
            code: "server".into(),
            message: format!("Codex usage 服务返回 HTTP {}", status.as_u16()),
        });
    }

    None
}

pub fn read_cache(app: &AppHandle) -> Option<UsageSnapshot> {
    storage::read_json(&cache_path(app)?)
}

pub fn write_cache(app: &AppHandle, snapshot: &UsageSnapshot) {
    let Some(path) = cache_path(app) else {
        return;
    };
    let _ = storage::write_json_atomic(&path, snapshot);
}

fn cache_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_cache_dir()
        .ok()
        .map(|directory| directory.join("usage-snapshot.json"))
}

fn snapshot_from_response(response: CodexUsageResponse, email: Option<String>) -> UsageSnapshot {
    let limits = response
        .rate_limit
        .map_or_else(UsageLimits::default, |limits| UsageLimits {
            primary: limits.primary_window.map(window_snapshot),
            secondary: limits.secondary_window.map(window_snapshot),
        });
    let account = if email.is_some() || response.plan_type.is_some() {
        Some(AccountSnapshot {
            email,
            plan: response.plan_type,
        })
    } else {
        None
    };

    UsageSnapshot {
        checked_at: chrono::Utc::now().to_rfc3339(),
        source: "codex-oauth".into(),
        stale: false,
        account,
        limits,
        credits: response.credits.map(|credits| CreditSnapshot {
            has_credits: credits.has_credits,
            unlimited: credits.unlimited,
            balance: credits.balance,
        }),
        error: None,
    }
}

fn window_snapshot(window: CodexWindow) -> WindowSnapshot {
    let used_percent = window.used_percent.clamp(0.0, 100.0);
    WindowSnapshot {
        used_percent,
        remaining_percent: 100.0 - used_percent,
        window_minutes: window.limit_window_seconds / 60,
        resets_at: window.reset_at,
    }
}

fn deserialize_optional_number<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    match value {
        serde_json::Value::Null => Ok(None),
        serde_json::Value::Number(number) => Ok(number.as_f64()),
        serde_json::Value::String(number) => Ok(number.parse().ok()),
        _ => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::{response_error, snapshot_from_response, CodexUsageResponse};
    use reqwest::StatusCode;

    #[test]
    fn parses_usage_and_string_credit_balance() {
        let response: CodexUsageResponse = serde_json::from_str(
            r#"{
                "plan_type":"plus",
                "rate_limit":{
                    "primary_window":{"used_percent":34,"reset_at":1700000000,"limit_window_seconds":18000},
                    "secondary_window":{"used_percent":81.5,"reset_at":1700500000,"limit_window_seconds":604800}
                },
                "credits":{"has_credits":true,"unlimited":false,"balance":"12.50"}
            }"#,
        )
        .expect("fixture should parse");

        let snapshot = snapshot_from_response(response, Some("fox@example.com".into()));
        assert_eq!(snapshot.limits.primary.unwrap().remaining_percent, 66.0);
        assert_eq!(snapshot.limits.secondary.unwrap().remaining_percent, 18.5);
        assert_eq!(snapshot.credits.unwrap().balance, Some(12.5));
        assert_eq!(snapshot.account.unwrap().plan.as_deref(), Some("plus"));
    }

    #[test]
    fn classifies_auth_and_server_responses() {
        assert_eq!(
            response_error(StatusCode::UNAUTHORIZED)
                .expect("unauthorized should fail")
                .code,
            "unauthorized"
        );
        assert_eq!(
            response_error(StatusCode::BAD_GATEWAY)
                .expect("server response should fail")
                .code,
            "server"
        );
        assert!(response_error(StatusCode::OK).is_none());
    }
}
