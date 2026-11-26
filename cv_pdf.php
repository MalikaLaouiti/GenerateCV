<?php
// Génère le PDF du CV (Dompdf) à partir des données JSON stockées en base.
// CSS volontairement simple : Dompdf ne gère ni flex ni grid.
require __DIR__ . '/vendor/autoload.php';
use Dompdf\Dompdf;

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function val($a, $k) { return trim($a[$k] ?? ''); }

function cv_pdf(array $cv) {
  $f = $cv['fields'] ?? []; $L = $cv['lists'] ?? [];
  // Statut « hidden » choisi par l'utilisateur : champs simples dans $cv['status'], entrées de liste dans leur 'status'
  $hid = is_array($cv['status'] ?? null) ? $cv['status'] : [];
  $off = function ($k) use ($hid) { return !in_array($k, ['nom', 'telephone', 'specialite', 'email'], true) && ($hid[$k] ?? '') === 'hidden'; }; // ces 4 champs sont obligatoires
  $v = function ($k) use ($f, $off) { return $off($k) ? '' : val($f, $k); };

  // « Nom:80 » devient « Nom · 80 % », comme dans l'aperçu
  $badges = function ($k) use ($f) {
    $out = [];
    foreach (explode(',', val($f, $k)) as $t) {
      $t = trim($t); if ($t === '') continue;
      $out[] = preg_match('/^(.*?)\s*:\s*(\d{1,3})\s*%?$/', $t, $m) && $m[1] !== '' ? h($m[1]) . ' · ' . min(100, (int)$m[2]) . ' %' : h($t);
    }
    return $out;
  };
  $section = function ($title, $body) { return $body === '' ? '' : '<h2>' . h($title) . '</h2>' . $body; };
  $para = function ($t) { return trim($t) === '' ? '' : '<p>' . nl2br(h($t)) . '</p>'; };
  $line = function ($parts) { $p = array_filter(array_map('trim', $parts)); return $p ? '<div class="meta">' . h(implode(' – ', $p)) . '</div>' : ''; };

  $contact = [];
  foreach (['email', 'telephone', 'ville', 'linkedin', 'github', 'portfolio'] as $k) if ($v($k) !== '') $contact[] = h($v($k));

  $skillTitles = ['competences-techniques' => 'Compétences techniques', 'langages' => 'Langages de programmation', 'outils' => 'Frameworks et outils',
    'bases' => 'Bases de données', 'transversales' => 'Compétences transversales', 'langues' => 'Langues', 'autres' => 'Autres compétences'];
  $skills = '';
  foreach ($skillTitles as $k => $t) if (!$off($k) && ($b = $badges($k))) $skills .= '<p><b>' . h($t) . ' :</b> ' . implode(' &nbsp;•&nbsp; ', $b) . '</p>';

  // Listes répétables : les entrées entièrement vides sont ignorées
  $items = function ($name, $render) use ($L) {
    $html = '';
    foreach ($L[$name] ?? [] as $e) if (($e['status'] ?? '') !== 'hidden' && array_filter($e, function ($v) { return trim($v) !== ''; })) $html .= $render($e);
    return $html;
  };
  $exp = $items('experiences', function ($e) use ($line, $para) {
    return '<div class="item"><div class="date">' . h(val($e, 'periode')) . '</div><h3>' . h(val($e, 'poste')) . '</h3>'
      . $line([val($e, 'entreprise'), val($e, 'lieu')]) . $para(val($e, 'description'))
      . (val($e, 'realisations') !== '' ? '<p><b>Réalisations :</b> ' . nl2br(h(val($e, 'realisations'))) . '</p>' : '') . '</div>';
  });
  $edu = $items('formations', function ($e) use ($line, $para) {
    return '<div class="item"><div class="date">' . h(val($e, 'annees')) . '</div><h3>' . h(val($e, 'diplome')) . '</h3>'
      . $line([val($e, 'etablissement'), val($e, 'ville-formation')]) . $para(val($e, 'description')) . '</div>';
  });
  $proj = $items('projets', function ($e) use ($para) {
    return '<div class="item"><h3>' . h(val($e, 'titre')) . '</h3>' . $para(val($e, 'description'))
      . (val($e, 'lien') !== '' ? '<div class="meta">' . h(val($e, 'lien')) . '</div>' : '') . '</div>';
  });

  // Photo : data URL validée uniquement (jamais d'URL externe, donc pas de SSRF)
  $photo = !$off('photo') && preg_match('#^data:image/(jpeg|png);base64,[A-Za-z0-9+/=]+$#', $cv['photo'] ?? '') ? '<img class="photo" src="' . $cv['photo'] . '">' : '';

  $html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    @page { margin: 0 }
    body { font-family: "DejaVu Sans", sans-serif; font-size: 10pt; color: #1c2340; margin: 0 }
    .hero { background: #2b1b66; color: #fff; padding: 28px 36px }
    .hero td { vertical-align: top }
    .photo { width: 90px; height: 90px; border-radius: 45px }
    .kicker { font-size: 8pt; letter-spacing: 2px; text-transform: uppercase; color: #5ee6f0; margin: 0 }
    .name { font-size: 22pt; font-weight: bold; margin: 2px 0 }
    .title { font-size: 12pt; color: #c9bfff; margin: 0 0 6px }
    .contact { font-size: 8.5pt; color: #ece8fb; margin: 8px 0 0 }
    .body { padding: 8px 36px 30px }
    h2 { font-size: 12pt; color: #5b3fd0; border-bottom: 2px solid #ece8fb; padding-bottom: 3px; margin: 18px 0 8px }
    h3 { font-size: 10.5pt; margin: 0 }
    p { margin: 3px 0 }
    .item { margin-bottom: 10px; page-break-inside: avoid }
    .date { float: right; font-size: 8.5pt; color: #0a7f8c }
    .meta { font-size: 9pt; color: #4a5273 }
    .foot { text-align: center; color: #4a5273; font-size: 9pt; padding: 0 36px 20px }
  </style></head><body>
  <div class="hero"><table width="100%"><tr>' . ($photo ? '<td width="110">' . $photo . '</td>' : '') . '<td>
    <p class="kicker">Curriculum vitæ</p><div class="name">' . ($off('nom') ? '' : h(val($f, 'nom') ?: 'Votre nom')) . '</div>
    <p class="title">' . h($v('specialite')) . '</p>' . $para($v('presentation')) . '
    <p class="contact">' . implode(' &nbsp;|&nbsp; ', $contact) . '</p></td></tr></table></div>
  <div class="body">' . $section('Compétences', $skills) . $section('Expériences professionnelles', $exp)
    . $section('Formations', $edu) . $section('Projets et certifications', $proj) . '</div>'
    . ($v('pied') !== '' ? '<div class="foot">' . h($v('pied')) . '</div>' : '') . '</body></html>';

  $pdf = new Dompdf(['isRemoteEnabled' => false, 'chroot' => __DIR__]);
  $pdf->loadHtml($html); $pdf->setPaper('A4'); $pdf->render();
  // Métadonnées du PDF (visibles dans les propriétés du fichier et lues par les logiciels de recrutement)
  $nom = val($f, 'nom');
  $pdf->addInfo('Title', $nom !== '' ? 'CV - ' . $nom : 'Curriculum vitae');
  if ($nom !== '') $pdf->addInfo('Author', $nom);
  if (val($f, 'specialite') !== '') $pdf->addInfo('Subject', val($f, 'specialite'));
  $pdf->addInfo('Creator', 'Générateur de CV');
  return $pdf->output();
}

// Nom de fichier sûr (ASCII) : « CV-Alice-Dupont.pdf », « cv.pdf » si le nom est vide
function cv_filename(array $cv) {
  $n = htmlentities(trim($cv['fields']['nom'] ?? ''), ENT_QUOTES, 'UTF-8');
  $n = preg_replace('/&([a-z])(acute|grave|circ|uml|cedil|tilde|ring);/i', '$1', $n);
  $n = trim(preg_replace('/[^A-Za-z0-9]+/', '-', $n), '-');
  return $n !== '' ? 'CV-' . substr($n, 0, 60) . '.pdf' : 'cv.pdf';
}
