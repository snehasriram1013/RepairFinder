const navWidth = 225;
let navClicked = false;

/*
Arguments: None
Return Value: None
Effects: Updates page interface if menu opened
*/

function bar() {
    if (navClicked) {
        closeNav();
    } else {
        openNav();
    }
}

/*
Arguments: None
Return Value: None
Effects: Narows page elements to accommodate sidebar menu
*/
function openNav() {
    $("#sidenav").width(navWidth);
    $("main").css("margin-left", navWidth + "px");
    $("main").css('width', '80%');
    $("#bar-button").css('background-color', 'rgb(14, 14, 99)');
    $("#bar-button").css('color', 'white');
    $("#bar-button").css('border-bottom', '1px solid lightgray');
    $("#page_title").css('margin-left', '31%');
    $("footer").css('width', '85%');
    $("#bar").css('margin-left', '40%');
    navClicked = true;
}

/*
Arguments: None
Return Value: None
Effects: Resizes page elements when sidebar menu closed
*/
function closeNav() {
    $("#sidenav").width(0);
    $("#bar-button").css('color', 'rgb(14, 14, 99)');
    $("#bar-button").css('background-color', 'rgb(200, 227, 236)');
    $("#bar-button").css('border-bottom', 'none');
    $("#page_title").css('margin-left', '23%');
    $("main").css("margin-left", "0px");
    $("main").css('width', '100%');
    $("footer").css('width', '100%');
    $("#bar").css('margin-left', '53%');
    navClicked = false;
}

//Handler to open/close menu when menu putton clicked
$("#bar-button").on("click", bar);

// toggle the user dropdown
$('#user-button').on('click', function(e) {
    e.stopPropagation();               // prevent the click from bubbling
    $('#user-dropdown').toggle();      // show/hide the menu
  });
  
  // click anywhere else closes the dropdown
  $(document).on('click', function() {
    $('#user-dropdown').hide();
  });
  