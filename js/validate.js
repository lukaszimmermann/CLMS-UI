var CLMSUI = CLMSUI || {};

CLMSUI.loadSpectra = function (match, randId, spectrumModel) {

    var url = "/xiAnnotator/annotate/"
        + match.searchId + "/" + (randId || "12345") + "/" + match.id 
        + "/?peptide=" + match.pepSeq1raw 
        + ((match.pepSeq2raw)? ("&peptide=" + match.pepSeq2raw) : "")
        + ((match.linkPos1)? ("&link=" + match.linkPos1) : "")
        + ((match.linkPos2)? ("&link=" + match.linkPos2) : "")
    ;
    
    d3.json (url, function(error, json) {
        if (error) {
            console.log ("error", error, "for", url);
            d3.select("#range-error").text ("Cannot load spectra from URL");
            spectrumModel.clear();
        } else {
            d3.select("#range-error").text ("");
            spectrumModel.set ({JSONdata: json, match: match, randId: randId}); 
        }
    });
}; 
			
CLMSUI.validate = function (matchId, validationStatus, randId, successCallBack) {
    $.ajax ({
        type: "POST",
        url: "./php/validateMatch.php",
        data: "mid=" + matchId + "&val=" + validationStatus + "&randId="+randId,
        contentType: "application/x-www-form-urlencoded",
        success: function (data, status, xhr){
            console.log ("SUCCESS VALIDATION", data, status, xhr.responseText);
            successCallBack();
        },
    });
};
