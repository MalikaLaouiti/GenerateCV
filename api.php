<?php
// API JSON sans framework : PHP + PDO + PostgreSQL. Un CV par utilisateur.
// Config : variables d'environnement DB_DSN, DB_USER, DB_PASS (valeurs par défaut ci-dessous).
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax']);
header('Content-Type: application/json');

$db = new PDO(getenv('DB_DSN') ?: 'pgsql:host=localhost;dbname=cv', getenv('DB_USER') ?: 'postgres', getenv('DB_PASS') ?: '',
  [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

function out($code, $data = null) { http_response_code($code); echo json_encode($data); exit; }

$a = $_GET['a'] ?? '';
$in = json_decode(file_get_contents('php://input'), true) ?: [];

if ($a === 'register' || $a === 'login') {
  $email = strtolower(trim($in['email'] ?? '')); $pass = $in['password'] ?? '';
  if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 8) out(400, 'Email invalide ou mot de passe < 8 caractères');
  if ($a === 'register') {
    try { $db->prepare('INSERT INTO users(email,password_hash) VALUES(?,?)')->execute([$email, password_hash($pass, PASSWORD_DEFAULT)]); }
    catch (PDOException $e) { out(409, 'Email déjà utilisé'); }
    $id = $db->lastInsertId('users_id_seq');
  } else {
    $s = $db->prepare('SELECT id, password_hash FROM users WHERE email=?'); $s->execute([$email]); $u = $s->fetch(PDO::FETCH_ASSOC);
    if (!$u || !password_verify($pass, $u['password_hash'])) out(401, 'Identifiants incorrects');
    $id = $u['id'];
  }
  session_regenerate_id(true); $_SESSION['uid'] = (int)$id; out(200, 'ok');
}
if ($a === 'logout') { session_destroy(); out(200, 'ok'); }

if (empty($_SESSION['uid'])) out(401, 'Non connecté');
$uid = $_SESSION['uid'];

if ($a === 'cv' && $_SERVER['REQUEST_METHOD'] === 'GET') {
  $s = $db->prepare('SELECT data FROM cv WHERE user_id=?'); $s->execute([$uid]);
  $d = $s->fetchColumn(); echo $d ?: 'null'; exit; // ponytail: pas de CSRF token (SameSite=Lax suffit pour PUT JSON)
}
if ($a === 'pdf') {
  $s = $db->prepare('SELECT data FROM cv WHERE user_id=?'); $s->execute([$uid]);
  $cv = json_decode($s->fetchColumn() ?: '{}', true) ?: [];
  require __DIR__ . '/cv_pdf.php';
  header('Content-Type: application/pdf'); header('Content-Disposition: attachment; filename="' . cv_filename($cv) . '"');
  echo cv_pdf($cv); exit;
}
if ($a === 'cv' && $_SERVER['REQUEST_METHOD'] === 'PUT') {
  $db->prepare('INSERT INTO cv(user_id,data) VALUES(?,?) ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()')
     ->execute([$uid, json_encode($in)]);
  out(200, 'ok');
}
out(404, 'Inconnu');
