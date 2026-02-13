export function errorHandler(err, _req, res, _next) {
  console.error('Error:', err);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Record already exists' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  const status = err.status || 500;
  // In production, don't leak internal error details for 500s
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
}
