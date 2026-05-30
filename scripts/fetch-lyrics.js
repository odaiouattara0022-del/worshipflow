/**
 * Fetch lyrics for empty songs from web sources
 * Usage: node scripts/fetch-lyrics.js
 */

const BASE_URL = "http://localhost:3000";
const COOKIE = "wf_session=admin-session";
const DELAY_MS = 2000; // Be respectful to sources

async function fetchAllSongs() {
  const res = await fetch(`${BASE_URL}/api/songs?search=`, {
    headers: { Cookie: COOKIE },
  });
  const data = await res.json();
  return (data.songs || data).filter((s) => !s.lyrics || !s.lyrics.trim());
}

async function searchLyrics(title, author) {
  // Clean title for search
  const cleanTitle = title
    .replace(/\(.*?\)/g, "")
    .replace(/feat\..*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const query = encodeURIComponent(`${cleanTitle} ${author} paroles lyrics`);

  try {
    // Try paroles.net / lyrics sources via a simple search
    const searchUrl = `https://www.google.com/search?q=${query}`;
    // We can't scrape Google, so we'll use a direct approach
    // Try multiple lyric sources

    const sources = [
      `https://api.lyrics.ovh/v1/${encodeURIComponent(author)}/${encodeURIComponent(cleanTitle)}`,
    ];

    for (const url of sources) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(5000),
          headers: { "User-Agent": "WorshipFlow/1.0" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.lyrics && data.lyrics.trim().length > 20) {
            return data.lyrics.trim();
          }
        }
      } catch {
        // try next source
      }
    }
  } catch {
    // silent
  }

  return null;
}

async function updateSongLyrics(id, lyrics) {
  const res = await fetch(`${BASE_URL}/api/songs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
    body: JSON.stringify({ lyrics }),
  });
  return res.ok;
}

async function main() {
  const emptySongs = await fetchAllSongs();
  console.log(`Found ${emptySongs.length} songs without lyrics\n`);

  let found = 0;
  let notFound = 0;

  for (const song of emptySongs) {
    process.stdout.write(`Searching: ${song.title} - ${song.author}... `);

    const lyrics = await searchLyrics(song.title, song.author);

    if (lyrics) {
      const ok = await updateSongLyrics(song.id, lyrics);
      if (ok) {
        found++;
        console.log(`✓ Found (${lyrics.length} chars)`);
      } else {
        console.log(`✗ Found but update failed`);
      }
    } else {
      notFound++;
      console.log(`— Not found`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone! Found: ${found}, Not found: ${notFound}`);
}

main().catch(console.error);
