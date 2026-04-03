const dashboardService = require("../services/dashboardService");

async function getSummary(req, res) {
  try {
    const { from, to } = req.query;
    const summary = dashboardService.getSummary({ from, to });
    return res.status(200).json(summary);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getCategoryBreakdown(req, res) {
  try {
    const { from, to, type } = req.query;
    const data = dashboardService.getCategoryBreakdown({ from, to, type });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getMonthlyTrend(req, res) {
  try {
    const { year } = req.query;
    const data = dashboardService.getMonthlyTrend({ year });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getWeeklyTrend(req, res) {
  try {
    const data = dashboardService.getWeeklyTrend();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getRecentActivity(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const data = dashboardService.getRecentActivity(limit);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrend, getWeeklyTrend, getRecentActivity };
