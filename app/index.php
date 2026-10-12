<?php

$apiResponse = null;
$apiError = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $message = trim((string) ($_POST['message'] ?? ''));
    $apiUrl = getenv('API_URL') ?: 'http://api.service.local';

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query(['message' => $message]),
            'timeout' => 3,
        ],
    ]);

    $rawResponse = @file_get_contents($apiUrl, false, $context);

    if ($rawResponse === false) {
        $apiError = 'Could not reach the API service.';
    } else {
        $decodedResponse = json_decode($rawResponse, true);
        $apiResponse = is_array($decodedResponse) ? $decodedResponse : ['raw' => $rawResponse];
    }
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
?>

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

      form {
        display: flex;
        gap: 0.75rem;
        margin: 2rem auto 0;
        max-width: 32rem;
      }

      input,
      button {
        border: 0;
        border-radius: 999px;
        font: inherit;
        padding: 0.9rem 1rem;
      }

      input {
        flex: 1;
        min-width: 0;
        color: #0f172a;
        background: #f8fafc;
      }

      button {
        color: #082f49;
        background: #67e8f9;
        cursor: pointer;
        font-weight: 700;
      }

      .api-result {
        padding: 1rem;
        border-radius: 1rem;
        background: rgba(14, 165, 233, 0.15);
        word-break: break-word;
      }

      .api-error {
        color: #fecaca;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Launching soon</p>
      <h1>Coming soon</h1>
      <p>We are putting the finishing touches on something new. Check back shortly.</p>
      <form method="post" action="/">
        <input name="message" type="text" placeholder="Send a message to the API" required>
        <button type="submit">Send</button>
      </form>
      <?php if ($apiResponse !== null): ?>
        <p class="api-result">API response: <?= e(json_encode($apiResponse, JSON_THROW_ON_ERROR)) ?></p>
      <?php elseif ($apiError !== null): ?>
        <p class="api-error"><?= e($apiError) ?></p>
      <?php endif; ?>
    </main>
  </body>
</html>
