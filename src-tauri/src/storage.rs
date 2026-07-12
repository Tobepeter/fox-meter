use std::{
    fs::{self, OpenOptions},
    io,
    path::Path,
};

use serde::{de::DeserializeOwned, Serialize};

pub fn read_json<T: DeserializeOwned>(path: &Path) -> Option<T> {
    let contents = fs::read_to_string(path).ok()?;
    serde_json::from_str(&contents).ok()
}

pub fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> io::Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::other("storage path has no parent"))?;
    fs::create_dir_all(parent)?;

    let temporary = path.with_extension("tmp");
    let mut file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(&temporary)?;
    serde_json::to_writer(&mut file, value).map_err(io::Error::other)?;
    file.sync_all()?;
    fs::rename(temporary, path)
}

#[cfg(test)]
mod tests {
    use std::{env, fs, process};

    use serde::{Deserialize, Serialize};

    use super::{read_json, write_json_atomic};

    #[derive(Debug, Deserialize, PartialEq, Serialize)]
    struct Fixture {
        enabled: bool,
    }

    #[test]
    fn replaces_json_without_leaving_partial_content() {
        let directory = env::temp_dir().join(format!("fox-meter-storage-{}", process::id()));
        let path = directory.join("fixture.json");

        write_json_atomic(&path, &Fixture { enabled: true }).expect("first write should succeed");
        write_json_atomic(&path, &Fixture { enabled: false }).expect("replace should succeed");

        assert_eq!(read_json(&path), Some(Fixture { enabled: false }));
        assert!(!path.with_extension("tmp").exists());

        let _ = fs::remove_dir_all(directory);
    }
}
