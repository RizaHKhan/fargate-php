<?php

header('Content-Type: application/json');

$message = $_POST['message'] ?? null;

if ($message === null) {
    $requestBody = file_get_contents('php://input');
    $jsonBody = json_decode($requestBody ?: '', true);

    if (is_array($jsonBody) && isset($jsonBody['message'])) {
        $message = $jsonBody['message'];
    }
}

$response = [
    'message' => 'Hello from the API',
];

if ($message !== null) {
    $response['received'] = trim((string) $message);
}

echo json_encode($response, JSON_THROW_ON_ERROR);
