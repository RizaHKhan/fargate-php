<?php ?>

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Coming Soon</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        color: #f8fafc;
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.35), transparent 32rem),
          radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.32), transparent 30rem),
          linear-gradient(135deg, #020617 0%, #0f172a 100%);
      }

      main {
        width: min(90vw, 42rem);
        padding: 4rem 2rem;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 2rem;
        background: rgba(15, 23, 42, 0.72);
        box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(18px);
      }

      .eyebrow {
        margin: 0 0 1rem;
        color: #67e8f9;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(3rem, 10vw, 6.5rem);
        line-height: 0.95;
        letter-spacing: -0.08em;
      }

      p {
        max-width: 32rem;
        margin: 1.5rem auto 0;
        color: #cbd5e1;
        font-size: clamp(1rem, 2vw, 1.2rem);
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Launching soon</p>
      <h1>Coming soon</h1>
      <p>We are putting the finishing touches on something new. Check back shortly.</p>
    </main>
  </body>
</html>
