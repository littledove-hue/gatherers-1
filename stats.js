// stats.js
const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');

/* ===================== CONFIG ===================== */

const GOOGLE_SHEET_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTEvXh5P_U89PiYbBh-yIB-jbFdBejWYEHTbLopxHo7yc4Gns77R4h4HkXMxUzFTOGaU9Jl5JimzB_A/pub?gid=0&single=true&output=csv';

const MESSAGE_TEXT = 'visited you, love the look';
const RATING_VALUE = 3;
const PODIUM_TYPE = 4;

const BETWEEN_LADIES_DELAY = 3000;

/* ================================================== */

async function loadLadiesFromSheet() {
  console.log('📥 [Stats] Fetching Google Sheet CSV...');

  const res = await fetch(GOOGLE_SHEET_CSV);
  const csvText = await res.text();

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`📊 [Stats] Loaded ${records.length} ladies`);
  console.log('📋 [Stats] Sample:', records.slice(0, 3));

  return records.map(r => ({
    ladyId: r.ladyID?.trim(),
    name: r.ladyName?.trim(),
  })).filter(r => r.ladyId);
}

async function voteForLady(page, ladyId) {
  console.log(`🗳️ [Vote] Sending vote for Lady ID ${ladyId}`);

  const response = await page.request.post(
    'https://v3.g.ladypopular.com/ranking/players.php',
    {
      form: {
        action: 'vote',
        podiumType: PODIUM_TYPE,
        ladyId: ladyId,
        rating: RATING_VALUE,
      },
    }
  );

  const json = await response.json();
  console.log('   📝 [Vote] Response:', json);

  return json;
}

async function sendMessage(page, ladyId, ladyName) {
  console.log(`💬 [Chat] Opening chat for ${ladyName} (${ladyId})`);

  await page.waitForSelector('button.message-btn', { timeout: 15000 });
  await page.click('button.message-btn');

  await page.waitForSelector('#msgArea', { timeout: 15000 });

  console.log('   ✍️ [Chat] Typing message...');
  await page.fill('#msgArea', MESSAGE_TEXT);

  await page.click('#_sendMessageButton');

  console.log('   ✅ [Chat] Message sent');
}

/* ===================== MAIN ===================== */

module.exports = async function runStatsExtractor(page) {
  console.log('📊 [Stats] Starting Vote + Message routine');

  const ladies = await loadLadiesFromSheet();

  if (ladies.length === 0) {
    console.log('❌ [Stats] No ladies found. Exiting.');
    return;
  }

  for (let i = 0; i < ladies.length; i++) {
    const { ladyId, name } = ladies[i];

    console.log(`\n📄 [Stats] ${i + 1}/${ladies.length} → ${name} (${ladyId})`);

    const profileUrl =
      `https://v3.g.ladypopular.com/profile.php?lady_id=${ladyId}`;

    console.log('🌐 [Stats] Visiting:', profileUrl);
    await page.goto(profileUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    let voteResult;
    try {
      voteResult = await voteForLady(page, ladyId);
    } catch (err) {
      console.log(`❌ [Vote] Error: ${err.message}`);
      continue;
    }

    if (voteResult?.status === 1) {
      try {
        await sendMessage(page, ladyId, name);
      } catch (err) {
        console.log(`❌ [Chat] Error: ${err.message}`);
      }
    } else {
      console.log('⚠️ [Stats] Vote failed or already voted, skipping message');
    }

    console.log(`⏳ [Stats] Waiting ${BETWEEN_LADIES_DELAY}ms`);
    await page.waitForTimeout(BETWEEN_LADIES_DELAY);
  }

  console.log('🏁 [Stats] Vote + Message routine complete');
};
