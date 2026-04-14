function sendSuccess(res, data, status = 200, extra = {}) {
  const safeExtra =
    extra && typeof extra === "object" && !Array.isArray(extra) ? extra : {};
  return res.status(status).json({
    success: true,
    data,
    error: null,
    ...safeExtra,
  });
}

function sendError(res, status, error, extra = {}) {
  const safeExtra =
    extra && typeof extra === "object" && !Array.isArray(extra) ? extra : {};
  return res.status(status).json({
    success: false,
    data: null,
    error,
    ...safeExtra,
  });
}

module.exports = {
  sendError,
  sendSuccess,
};
