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
      if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
          showNotification("Webhook Invalid", "error");
          return;
      }

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
          // Cache tous les containers avant de montrer celui sélectionné
          document.querySelectorAll(".container-section").forEach(section => {
              section.classList.remove("active");
          });

          const sectionId = button.getAttribute("data-section");
          const sectionToShow = document.getElementById(sectionId);

          if (sectionToShow) {
              sectionToShow.classList.add("active");
          }

          // Assurez-vous que l'edit container est bien activé si le bouton "Edit" est cliqué
          if (sectionId === "edit") {
              editContainer.classList.add("active");
              infoContainer.classList.remove("active");
          }
      });
  });

  // Afficher un aperçu de l'avatar téléchargé
  document.getElementById("edit-avatar").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = function (e) {
              const preview = document.getElementById("avatar-preview");
              preview.src = e.target.result;
              preview.style.display = "block"; // Affiche l'aperçu
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
              reader.onload = () => resolve(reader.result.split(",")[1]); // Base64 sans le préfixe "data:image/png;base64,"
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

          // Mise à jour en direct dans l'info container
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

  document.getElementById("start-messages").addEventListener("click", async () => {
      const messageText = document.getElementById("message-text").value.trim();
      const delay = parseInt(document.getElementById("message-delay").value, 10);

      if (!messageText || isNaN(delay) || delay < 100) {
          showNotification("Invalid Input", "error");
          return;
      }

      showNotification("Sending Messages...");
      while (true) {
          try {
              const response = await fetch(webhookUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: messageText })
              });

              if (!response.ok) throw new Error("Rate Limited");
              showNotification("Message Sent");
          } catch {
              showNotification("Rate Limited", "error");
              break;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
      }
  });

  document.getElementById("delete-webhook").addEventListener("click", async () => {
      await fetch(webhookUrl, { method: "DELETE" });
      showNotification("Webhook Deleted");
      setTimeout(() => location.reload(), 2000);
  });
});
