
$(function() {

  $("button").click(function(event) {
    var sessoin_id = event.target.id.substring(15);

    $.ajax({
      type: "POST",
      url: "/response",
      contentType: "application/json",
      data: "{ \"status\": 200, \"developerMessage\": \"force terminate\" }",
      headers: {
        "X-VHTTPD-REQUEST-CODE" : sessoin_id
      }
    })
    .done(function(data, textStatus, jqXHR) {
      $("#" + event.target.id).parent().parent().remove();
    });

  });

});
