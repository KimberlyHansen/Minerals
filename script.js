const minerals = [
    {
        name: "Quartz",
        image: "url/to/quartz-photo.jpg",
        info: "Quartz is one of the most abundant minerals in Earth's crust."
    },
    {
        name: "Mica",
        image: "url/to/mica-photo.jpg",
        info: "Mica is a shiny silicate mineral that can be split into thin sheets."
    },
    {
        name: "Feldspar",
        image: "url/to/feldspar-photo.jpg",
        info: "Feldspar is the name given to a group of minerals that are all similar."
    }
];

// Function to display minerals
function displayMinerals() {
    const container = document.getElementById("minerals-container");
    
    minerals.forEach(mineral => {
        const mineralDiv = document.createElement("div");
        mineralDiv.className = "mineral";

        const mineralName = document.createElement("h2");
        mineralName.textContent = mineral.name;

        const mineralImage = document.createElement("img");
        mineralImage.src = mineral.image;
        mineralImage.alt = mineral.name;

        const mineralInfo = document.createElement("p");
        mineralInfo.textContent = mineral.info;

        mineralDiv.appendChild(mineralName);
        mineralDiv.appendChild(mineralImage);
        mineralDiv.appendChild(mineralInfo);
        container.appendChild(mineralDiv);
    });
}

// Call the function to display minerals when the window loads
window.onload = displayMinerals;