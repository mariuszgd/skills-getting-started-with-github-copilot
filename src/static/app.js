document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const submitButton = signupForm.querySelector('button[type="submit"]');
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = (details.participants && details.participants.length)
          ? `<ul class="participants-list">${details.participants.map(p => `<li><span class="participant-email">${p}</span><button class="delete-participant" data-activity="${name}" data-email="${p}" aria-label="Remove ${p}">✖</button></li>`).join("")}</ul>`
          : '<p class="no-participants">No participants yet</p>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p class="participants-title">Participants</p>
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    // Disable submit to prevent duplicate submissions
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so participant lists and availability update
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    } finally {
      // Re-enable submit button
      if (submitButton) submitButton.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();

  // Handle participant delete (delegated)
  activitiesList.addEventListener('click', async (e) => {
    const target = e.target;
    if (!target || !target.classList.contains('delete-participant')) return;

    const email = target.dataset.email;
    const activity = target.dataset.activity;
    if (!email || !activity) return;

    if (!confirm(`Remove ${email} from ${activity}?`)) return;

    target.disabled = true;
    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        messageDiv.textContent = json.message || `Removed ${email}`;
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        await fetchActivities();
      } else {
        messageDiv.textContent = json.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }
      setTimeout(() => messageDiv.classList.add('hidden'), 5000);
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Error removing participant';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    } finally {
      target.disabled = false;
    }
  });
});
