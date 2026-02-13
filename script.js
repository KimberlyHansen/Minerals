// script.js

// Load mineral data
async function loadMinerals() {
    const response = await fetch('path/to/mineral/data.json');
    const minerals = await response.json();
    displayMineralCards(minerals);
}

// Display mineral cards
function displayMineralCards(minerals) {
    const container = document.getElementById('mineral-cards-container');
    minerals.forEach(mineral => {
        const card = document.createElement('div');
        card.className = 'mineral-card';
        card.innerHTML = `<h3>${mineral.name}</h3>\n            <img src='${mineral.photo}' alt='${mineral.name}'>\n            <p>${mineral.description}</p>`;
        container.appendChild(card);
    });
}

// Handle user interactions
function addInteractionHandlers() {
    const cards = document.querySelectorAll('.mineral-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            alert(`You clicked on ${card.querySelector('h3').innerText}`);
        });
    });
}

// Initialize the app
loadMinerals().then(addInteractionHandlers);