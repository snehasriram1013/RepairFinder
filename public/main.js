// Get the navbar width for calculations
const navWidth = 225;
let navClicked = false;

function bar() {
    if (navClicked) {
        closeNav();
    } else {
        openNav();
    }
}

function openNav() {
    $("#sidenav").width(navWidth);
    $("main").css("margin-left", navWidth + "px");
    $("main").css('width', '80%');
    $("#bar-button").css('background-color', 'rgb(14, 14, 99)');
    $("#bar-button").css('color', 'white');
    $("#bar-button").css('border-bottom', '1px solid lightgray');
    $("#page_title").css('margin-left', '31%');
    navClicked = true;
}

function closeNav() {
    $("#sidenav").width(0);
    $("#bar-button").css('color', 'rgb(14, 14, 99)');
    $("#bar-button").css('background-color', 'rgb(200, 227, 236)');
    $("#bar-button").css('border-bottom', 'none');
    $("#page_title").css('margin-left', '23%');
    $("main").css("margin-left", "0px");
    $("main").css('width', '100%');
    navClicked = false;
}

// Close the nav when clicking on a link (optional)
document.querySelectorAll('.sidenav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) { // Only auto-close on mobile
            closeNav();
        }
    });
});

$("#bar-button").on("click", bar);
