
$(function() {

  // submit button clicked
  $("#vproxy_submit").click(function() {
    var method = $("#vproxy_request_method").val();
    var path = $("#vproxy_request_path").val();
    var body = $("#vproxy_request_body").val();

    // set request text area
    if (body && body.length > 0) {
      $("#vproxy_request_textarea").val(
          method + " " + path + " HTTP/1.1" + "\n"
          + "Host: " + location.host + "\n"
          + "\n"
          + body
      );
    } else {
      $("#vproxy_request_textarea").val(
          method + " " + path + " HTTP/1.1" + "\n"
          + "Host: " + location.host + "\n"
          + "\n\n"
      );
    }

    // set response text area
    $("#vproxy_response_textarea").val("wait response...");

    // send request
    $.ajax({
      type: method,
      url: path,
      data: body
    })
    .done(function(data, textStatus, jqXHR) {
      // set response text area
      $("#vproxy_response_textarea").val(
          "HTTP/1.1 " + jqXHR.status + " " + jqXHR.statusText + "\n"
          + jqXHR.getAllResponseHeaders()
          + "\n"
          + jqXHR.responseText
      );
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      // set response text area
      $("#vproxy_response_textarea").val(
          "HTTP/1.1 " + jqXHR.status + " " + jqXHR.statusText + "\n"
          + jqXHR.getAllResponseHeaders()
          + "\n"
          + jqXHR.responseText
      );
    });

  });

});
