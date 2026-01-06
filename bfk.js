module.exports = async function runBoyfriendKiss(page) {
  console.log("💋 Navigating to My Boyfriend page...");
  await page.goto('https://v3.g.ladypopular.com/myboy.php', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  console.log("💋 Attempting to kiss boyfriend via internal API...");

  const result = await page.evaluate(async () => {
    const res = await fetch('/ajax/boyfriend.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        type: 'performAction',
        actionName: 'kiss'
      }),
      credentials: 'same-origin'
    });

    return await res.json();
  });

  if (!result || typeof result !== 'object') {
    throw new Error('Invalid response from boyfriend API');
  }

  if (result.status === 1) {
    console.log("💖 Kiss successful!");

    if (result.rewards?.boyfriend_stats_increase) {
      console.log("📈 Stats gained:", result.rewards.boyfriend_stats_increase);
    }

    const kissAction = Object.values(result.actions || {}).find(
      a => a.action_name === 'kiss'
    );

    if (kissAction?.time_left) {
      const hours = Math.floor(kissAction.time_left / 3600);
      const minutes = Math.floor((kissAction.time_left % 3600) / 60);
      console.log(`⏳ Next kiss available in ${hours}h ${minutes}m`);
    }
  } else {
    console.log("🚫 Kiss not performed.");
    console.log(result);
  }
};
