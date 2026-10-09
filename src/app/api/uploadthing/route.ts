// Uploads now pass through project ownership, format, size and hash validation.
export function POST() { return Response.json({ error: 'Use the project file upload endpoint.' }, { status: 410 }); }
