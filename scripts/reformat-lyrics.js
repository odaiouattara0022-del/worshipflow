/**
 * Reformat all song lyrics to have exactly 2 lines per slide (block).
 * Each block is separated by a blank line.
 * Run: node scripts/reformat-lyrics.js
 */

const BASE = "http://localhost:3000";

function reformatLyrics(lyrics) {
  // Split into lines, remove trailing whitespace
  const lines = lyrics.split("\n").map(l => l.trimEnd());

  // Collect all non-empty lines (flatten all blocks)
  const contentLines = [];
  for (const line of lines) {
    if (line.trim() !== "") {
      contentLines.push(line);
    }
  }

  // Re-group into blocks of 2 lines
  const blocks = [];
  for (let i = 0; i < contentLines.length; i += 2) {
    if (i + 1 < contentLines.length) {
      blocks.push(contentLines[i] + "\n" + contentLines[i + 1]);
    } else {
      // Odd line at the end — keep it as a single-line block
      blocks.push(contentLines[i]);
    }
  }

  return blocks.join("\n\n");
}

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Administrateur", pin: "1234" }),
  });

  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    process.exit(1);
  }

  const setCookie = loginRes.headers.get("set-cookie");
  const sessionMatch = setCookie?.match(/wf_session=([^;]+)/);
  if (!sessionMatch) {
    console.error("No session cookie received");
    process.exit(1);
  }
  const cookie = `wf_session=${sessionMatch[1]}`;
  console.log("✓ Logged in\n");

  // Get all songs
  const songsRes = await fetch(`${BASE}/api/songs`, {
    headers: { Cookie: cookie },
  });
  const songs = await songsRes.json();
  console.log(`${songs.length} chants trouvés\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const song of songs) {
    const original = song.lyrics || "";
    const reformatted = reformatLyrics(original);

    if (reformatted === original) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(`${BASE}/api/songs/${song.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({ lyrics: reformatted }),
      });

      if (res.ok) {
        updated++;
        console.log(`  ✓ ${song.title}`);
      } else {
        failed++;
        const err = await res.json();
        console.log(`  ✗ ${song.title} — ${err.error}`);
      }
    } catch (err) {
      failed++;
      console.log(`  ✗ ${song.title} — ${err.message}`);
    }
  }

  console.log(`\n=============================`);
  console.log(`Reformatés: ${updated}`);
  console.log(`Déjà OK:    ${skipped}`);
  console.log(`Échecs:     ${failed}`);
  console.log(`Total:      ${songs.length}`);
}

main();
