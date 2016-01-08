(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    global.CLMSUI.BackboneModelTypes = global.CLMSUI.BackboneModelTypes || {};

    global.CLMSUI.BackboneModelTypes.AlignModel = global.Backbone.Model.extend ({
        defaults: {
            "scoreMatrix": undefined,   // slot for a BLOSUM type matrix
            "matchScore": 1,    // match and mis should be superceded by the score matrix if present
            "misScore": -1,
            "gapOpenScore" : -3,
            "gapExtendScore" : -2,
            "gapAtStartScore": 0,   // fixed penalty for starting with a gap (semi-global alignment)
            "refSeq": "CHATTER",
            "refID": "Canonical",
            "compSeqs": ["CAT"],
            "compIDs": ["Demo"],
            "local": false,
            "sequenceAligner": global.CLMSUI.GotohAligner,
        },
        
        initialize: function () {
            console.log ("in alignmodel initializer");
            // do more with these change listeners if we want to automatically run align function on various parameters changing;
            // or we may just want to call align manually when things are known to be done
            this.listenTo (this, "change", function() { 
                console.log ("something in align settings changed", this.changed); 
                if (!("refAlignments" in this.changed) && !("compAlignments" in this.changed)) {
                    console.log ("and it's not the final results so lets runs align again");
                    this.align();
                }
            });
            return this;
        },
        
        align: function () {
            console.log ("alignModel", this);
            
            var scores = {
                matrix: this.get("scoreMatrix"),
                match: this.get("matchScore"), 
                mis: this.get("misScore"), 
                gapOpen: this.get("gapOpenScore"), 
                gapExt: this.get("gapExtendScore"),
                gapAtStart: this.get("gapAtStartScore")
            };
            
            var refSeq = this.get("refSeq");
            var aligner = this.get("sequenceAligner");
            var fullResults = this.get("compSeqs").map (function (cSeq) {
                return aligner.align (cSeq, refSeq, scores, this.get("local"));
            }, this);
            
            var refResults = fullResults.map (function (res) {
               return {str: res.fmt[1], label: this.get("refID")}; 
            }, this);
            
            var compResults = fullResults.map (function (res, i) {
               return {
                   str: res.fmt[0], 
                   refStr: res.fmt[1], 
                   convertToRef: res.indx.qToTarget, 
                   convertFromRef: res.indx.tToQuery, 
                   cigar: res.res[2], 
                   score: res.res[0], 
                   label: this.get("compIDs")[i]}; 
                }, 
                this
            );
            
            this
                .set ("refAlignments", refResults)
                .set ("compAlignments", compResults)
            ;
            
            return this;
        },
    });
})(this); 