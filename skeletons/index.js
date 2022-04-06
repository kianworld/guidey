function fillOutInfo() {
    var showTitle = prompt("Enter a title:");
    var showDescription = prompt("Enter a description:");
    var showYear = prompt("Enter a year:");
    var showGenre = prompt("Enter a genre:");

    console.log("Title" + showTitle + "Desc" + showDescription + showYear + showGenre);

    if (showTitle === "" || showDescription === "" || showYear === "" || showGenre === "") {
        document.querySelector("#show-title").textContent = "Error: missing";
        document.querySelector("#show-description").textContent = "Error: missing";
        document.querySelector("#show-year").textContent = "Error: missing";
        document.querySelector("#show-genre").textContent = "Error: missing";
        console.log("Fill out something next time");
    }
    else {
        document.querySelector("#show-title").textContent = showTitle;
        document.querySelector("#show-description").textContent = showDescription;
        document.querySelector("#show-year").textContent = showYear;
        document.querySelector("#show-genre").textContent = showGenre;
        console.log("Love u");
    }
}