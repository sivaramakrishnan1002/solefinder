const cron = require("node-cron");

function startScheduler(runScraper) {
  console.log("Auto-scraper started...");

  try {
    cron.schedule("0 */6 * * *", async () => {
      console.log("Running auto scrape...");

      try {
        await runScraper();
      } catch (error) {
        console.error("Scheduler error:", error.message);
      }
    });
  } catch (error) {
    console.error("Failed to start scheduler:", error.message);
  }
}

module.exports = {
  startScheduler,
};
