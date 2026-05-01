const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>coming soon</title>
  </head>
  <body style="font-family: system-ui, sans-serif; text-align: center; margin-top: 6rem;">
    <p>coming soon</p>
  </body>
</html>
`;

export default {
  fetch(): Response {
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
} satisfies ExportedHandler;
