document.addEventListener("DOMContentLoaded", () => {
  const webhookInput = document.getElementById("webhook-url");
  const validateButton = document.getElementById("validate-webhook");
  const navButtons = document.querySelector(".nav-buttons");
  const notification = document.getElementById("notification");

  const infoContainer = document.getElementById("info");
  const editContainer = document.getElementById("edit");
  const messagesContainer = document.getElementById("messages");
  const deleteContainer = document.getElementById("delete");

  const webhookName = document.getElementById("webhook-name");
  const webhookAvatar = document.getElementById("webhook-avatar");
  const webhookID = document.getElementById("webhook-id");
  const guildID = document.getElementById("guild-id");
  const channelID = document.getElementById("channel-id");

  let webhookUrl = "";
  let webhookData = {};

  // Création des flocons de neige
  function createSnowflake() {
    const snowflake = document.createElement("div");
    snowflake.classList.add("snowflake");
    // Position horizontale aléatoire
    const leftPosition = Math.random() * window.innerWidth;
    const size = (Math.random() * 5) + 5; // entre 5px et 10px
    snowflake.style.left = leftPosition + "px";
    snowflake.style.width = size + "px";
    snowflake.style.height = size + "px";
    // S'assurer que le flocon spawn en haut
    snowflake.style.top = "-10px";
    // Durée d'animation aléatoire
    snowflake.style.animationDuration = (Math.random() * 5 + 5) + "s";
    
    document.querySelector(".snow").appendChild(snowflake);
    // Supprimer le flocon après 10s
    setTimeout(() => {
      snowflake.remove();
    }, 10000);
  }
  // Créer des flocons toutes les 100ms
  setInterval(createSnowflake, 100);

  function showNotification(message, type = "success") {
    notification.textContent = message;
    notification.className = "notification show";
    if (type === "error") {
      notification.style.backgroundColor = "red";
    } else {
      notification.style.backgroundColor = "green";
    }
    setTimeout(() => {
      notification.className = "notification";
    }, 3000);
  }

  async function validateWebhook() {
    webhookUrl = webhookInput.value.trim();
    // Retiré la vérification startsWith pour accepter n'importe quelle URL
    try {
      const response = await fetch(webhookUrl);
      if (!response.ok) throw new Error("Invalid Webhook");
      webhookData = await response.json();

      webhookName.textContent = webhookData.name;
      webhookAvatar.src = webhookData.avatar
        ? `https://cdn.discordapp.com/avatars/${webhookData.id}/${webhookData.avatar}.png`
        : "https://cdn.discordapp.com/embed/avatars/0.png";
      webhookID.textContent = webhookData.id;
      guildID.textContent = webhookData.guild_id || "N/A";
      channelID.textContent = webhookData.channel_id;

      webhookInput.style.opacity = 0;
      validateButton.style.opacity = 0;
      setTimeout(() => {
        webhookInput.classList.add("hidden");
        validateButton.classList.add("hidden");
        navButtons.classList.add("visible");
        infoContainer.classList.add("active");
        editContainer.classList.remove("active"); // Cache le container Edit dès le début
      }, 500);

      showNotification("Webhook Valid");
    } catch (error) {
      showNotification("Webhook Invalid", "error");
    }
  }

  validateButton.addEventListener("click", validateWebhook);

  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => {
      // Cache tous les containers
      document.querySelectorAll(".container-section").forEach(section => {
        section.classList.remove("active");
      });

      const sectionId = button.getAttribute("data-section");
      const sectionToShow = document.getElementById(sectionId);
      if (sectionToShow) {
        sectionToShow.classList.add("active");
      }

      // Si Edit est cliqué, afficher Edit et masquer Info
      if (sectionId === "edit") {
        editContainer.classList.add("active");
        infoContainer.classList.remove("active");
      }
    });
  });

  // Aperçu de l'avatar téléchargé
  document.getElementById("edit-avatar").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const preview = document.getElementById("avatar-preview");
        preview.src = e.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  // Appliquer les changements (nom et avatar)
  document.getElementById("apply-changes").addEventListener("click", async () => {
    const newName = document.getElementById("edit-name").value.trim();
    const avatarFile = document.getElementById("edit-avatar").files[0];

    let newAvatar = null;
    if (avatarFile) {
      const reader = new FileReader();
      reader.readAsDataURL(avatarFile);
      newAvatar = await new Promise(resolve => {
        reader.onload = () => resolve(reader.result.split(",")[1]);
      });
    }

    const payload = {};
    if (newName) payload.name = newName;
    if (newAvatar) payload.avatar = `data:image/png;base64,${newAvatar}`;

    try {
      const response = await fetch(webhookUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to update");

      showNotification("Webhook Updated");

      if (newName) {
        webhookName.textContent = newName;
      }
      if (newAvatar) {
        webhookAvatar.src = `data:image/png;base64,${newAvatar}`;
      }
    } catch (error) {
      showNotification("Update Failed", "error");
    }
  });

  // Gestion du bouton Start/Stop pour l'envoi des messages
  const startStopBtn = document.getElementById("start-messages");
  let sending = false;
  startStopBtn.addEventListener("click", async () => {
    if (!sending) {
      sending = true;
      startStopBtn.textContent = "Stop";
      startStopBtn.classList.remove("apply-button");
      startStopBtn.classList.add("btn-stop");
      
      const messageText = document.getElementById("message-text").value.trim();
      const delay = parseInt(document.getElementById("message-delay").value, 10);
      if (!messageText || isNaN(delay) || delay < 1) {
        showNotification("Invalid Input", "error");
        sending = false;
        startStopBtn.textContent = "Start";
        startStopBtn.classList.remove("btn-stop");
        startStopBtn.classList.add("apply-button");
        return;
      }
      
      showNotification("Sending Messages...");
      while (sending) {
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: messageText })
          });
          if (!response.ok) {
            showNotification("Rate Limited", "error");
          } else {
            showNotification("Message Sent");
          }
        } catch (error) {
          showNotification("Error Sending Message", "error");
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } else {
      sending = false;
      startStopBtn.textContent = "Start";
      startStopBtn.classList.remove("btn-stop");
      startStopBtn.classList.add("apply-button");
      showNotification("Messages Stopped");
    }
  });

  document.getElementById("delete-webhook").addEventListener("click", async () => {
    await fetch(webhookUrl, { method: "DELETE" });
    showNotification("Webhook Deleted");
    setTimeout(() => location.reload(), 2000);
  });
});
