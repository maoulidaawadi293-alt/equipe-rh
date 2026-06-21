// Module d'envoi d'email, utilisé pour transmettre leurs identifiants
// aux nouveaux salariés créés par l'employeur.

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail({ to, name, password }) {
  try {
    await resend.emails.send({
      from: "EquipeRH <onboarding@resend.dev>",
      to,
      subject: "Vos identifiants EquipeRH",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Bienvenue sur EquipeRH, ${name} !</h2>
          <p>Un compte vient d'être créé pour vous par votre employeur. Voici vos identifiants de connexion :</p>
          <p><strong>Email :</strong> ${to}<br/>
          <strong>Mot de passe temporaire :</strong> ${password}</p>
          <p>Vous pourrez changer ce mot de passe une fois connecté.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Erreur envoi email:", err);
    return false; // on ne bloque pas la création du compte si l'email échoue
  }
}

module.exports = { sendWelcomeEmail };