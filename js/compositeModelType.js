

    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};
    
    CLMSUI.BackboneModelTypes.CompositeModelType = Backbone.Model.extend ({
        applyFilter: function () {
			var filterModel = this.get("filterModel");
            var clmsModel = this.get("clmsModel");
            var crossLinksArr = Array.from(clmsModel.get("crossLinks").values());
			var clCount = crossLinksArr.length;
			
			// if its FDR based filtering,
			// set all matches fdrPass att to false, then calc
			if (filterModel && filterModel.get("fdrMode")) {
				var matches = clmsModel.get("matches");
				var matchesLen = matches.length;
				for (var m = 0; m < matchesLen; ++m){
					matches[m].fdrPass = false;
				}
				var result = CLMSUI.fdr(crossLinksArr, {threshold: filterModel.get("fdrThreshold")});

				filterModel.set({
                    "interFdrCut": result[0].thresholdMet ? result[0].fdr : undefined, // undefined what threshold score should be if all links fail fdr
                    "intraFdrCut": result[1].thresholdMet ? result[1].fdr : undefined 
                }, {silent: true});
				
			}

            for (var i = 0; i < clCount; ++i) {
				var crossLink = crossLinksArr[i];
				if (filterModel) {
					crossLink.filteredMatches_pp = [];
					if (filterModel.get("fdrMode") === true) {
						var pass;// = filterModel.filterLink (crossLink);
						if (crossLink.meta && crossLink.meta.meanMatchScore !== undefined) {
							var fdr = crossLink.meta.meanMatchScore;
							var intra = clmsModel.isIntraLink (crossLink);
							var cut = intra ? result[1].fdr : result[0].fdr;
							pass = fdr >= cut;
						}
            
						if (pass) {
							crossLink.filteredMatches_pp = crossLink.matches_pp.filter(
								function (value) {
									return filterModel.subsetFilter(value.match);
								}
							);

							crossLink.ambiguous = 
								!crossLink.filteredMatches_pp.some (function (matchAndPepPos) {
									return matchAndPepPos.match.crossLinks.length === 1;
								})
							;
							for (filteredMatch_pp of crossLink.filteredMatches_pp) {
								filteredMatch_pp.match.fdrPass = true;
							}    
						}
						//~ else {
							//~ alert("i just failed fdr check");
						//~ }
					} else {
						crossLink.ambiguous = true;
						crossLink.confirmedHomomultimer = false;
						for (var matchAndPepPos of crossLink.matches_pp) {	
							var match = matchAndPepPos.match;
							//~ console.log(filterModel.subsetFilter(match),
										//~ filterModel.validationStatusFilter(match),
										//~ filterModel.navigationFilter(match));
							var result = /*match.is_decoy === false && */
											filterModel.subsetFilter(match)
											&& filterModel.validationStatusFilter(match)
											&& filterModel.navigationFilter(match);
							var decoys = filterModel.get("decoys");
							if (decoys === false && match.is_decoy === true){
								result = false;
							}
							
							if (result === true){
								crossLink.filteredMatches_pp.push(matchAndPepPos);
								if (match.crossLinks.length === 1) {
									crossLink.ambiguous = false;
								}
								if (match.confirmedHomomultimer === true) {
									crossLink.confirmedHomomultimer = true;
								}                       
							}
						}
					}
				}
				else {
					crossLink.filteredMatches_pp = crossLink.matches_pp;
				}
            }

            //HI MARTIN - I'm caching things in these arrays,
            // its maybe not a very nice design wise, lets look at again 
            this.filteredCrossLinks = [];
			this.filteredNotDecoyNotLinearCrossLinks = [];
			
			for (var i = 0; i < clCount; ++i) {
				var crossLink = crossLinksArr[i];
				if (crossLink.filteredMatches_pp.length) {
					this.filteredCrossLinks.push(crossLink);
					if (!crossLink.fromProtein.is_decoy && crossLink.toProtein && !crossLink.toProtein.is_decoy) {
						this.filteredNotDecoyNotLinearCrossLinks.push(crossLink);
					}
				}
            };
            
            var participantsArr = Array.from(clmsModel.get("participants").values());
            var participantCount = participantsArr.length;           
            
            for (var p = 0; p < participantCount; ++p) {
				 var participant = participantsArr[p]; 
				 participant.filteredNotDecoyNotLinearCrossLinks = [];
				 
				 var partCls = participant.crossLinks;
				 var partClCount = partCls.length;
				 
				 for (var pCl = 0; pCl < partClCount; ++pCl) {
					var pCrossLink = partCls[pCl];
					if (pCrossLink.filteredMatches_pp.length 
							&& !pCrossLink.fromProtein.is_decoy 
							&& pCrossLink.toProtein 
							&& !pCrossLink.toProtein.is_decoy) {
						participant.filteredNotDecoyNotLinearCrossLinks.push (pCrossLink);
					}
				}
				
				if (participant.filteredNotDecoyNotLinearCrossLinks.length > 0) {
					 participant.hidden = false;
				}
				else {
					 participant.hidden = true;
				}			 
			}
			
			this.trigger ("filteringDone");
            this.trigger ("hiddenChanged");
                        
            return this;
        },

        getFilteredCrossLinks: function (crossLinks) {
			
			/*
			 * store results and return that, see above
			 * */
			
            return this.filteredCrossLinks;
        },
        
        collateMatchRegions: function (crossLinks) {
            var fromPeptides = [], toPeptides = [], regs = [], prots = {};
            crossLinks.forEach (function (crossLink) {
                crossLink.filteredMatches_pp.forEach (function (matchAndPepPos) {
                    console.log ("match", match);
                    var smatch = matchAndPepPos.match;
                    var prot1 = smatch.matchedPeptides[0].prt[0];
                    var prot2 = smatch.matchedPeptides[1].prt[0];
                    prots[prot1] = prots[prot1] || [];
                    prots[prot2] = prots[prot2] || [];

                    var fromPepStart = matchAndPepPos.pepPos[0].start - 1;
                    var fromPepLength = matchAndPepPos.pepPos[0].length;
                    var toPepStart = matchAndPepPos.pepPos[1].start - 1;
                    var toPepLength = matchAndPepPos.pepPos[1].length;
                    
                    prots[prot1].push ({protein: prot1, start: fromPepStart, end: fromPepStart + fromPepStart });
                    prots[prot2].push ({protein: prot2, start: toPepStart, end: toPepStart + toPepLength }); 
                });
            });
            
            console.log ("match regions", prots);
            
            return prots;
        },
        
        // modelProperty can be "highlights" or "selection" (or a new one) depending on what array you want
        // to fill in the model
        // - i'm not sure this is a good name for this function - cc
        calcMatchingCrosslinks: function (modelProperty, crossLinks, andAlternatives, add) {
            if (crossLinks) {   // if undefined nothing happens, to remove selection pass an empty array - []
                if (add) {
                    var existingCrossLinks = this.get (modelProperty);
                    crossLinks = crossLinks.concat (existingCrossLinks);
                    console.log ("excl", existingCrossLinks);
                }
                var crossLinkMap = d3.map (crossLinks, function(d) { return d.id; });

                if (andAlternatives) {
                    crossLinks.forEach (function (crossLink) {
                        if (crossLink.ambiguous || crossLink.ambig) {
                           this.recurseAmbiguity (crossLink, crossLinkMap);
                        }
                    }, this);
                }
                var dedupedCrossLinks = crossLinkMap.values();
                this.set (modelProperty, dedupedCrossLinks);
            }
        },

        recurseAmbiguity: function (crossLink, crossLinkMap) {
            var matches = crossLink.filteredMatches_pp;
            matches.forEach (function (match) {
                var matchData = match.match;
                if (matchData.isAmbig()) {
                    matchData.crossLinks.forEach (function (overlapCrossLink) {
                        if (!crossLinkMap.has (overlapCrossLink.id)) {
                            crossLinkMap.set (overlapCrossLink.id, overlapCrossLink);
                            this.recurseAmbiguity (overlapCrossLink, crossLinkMap);
                        }
                    }, this);
                }
            }, this);
        },
        
        //what type should selectedProtein be? Set? Array? Is a map needed?
        setSelectedProteins: function (idArr, add) {
            var map = add ? new Map (this.get("selectedProtein")) : new Map ();
            idArr.forEach (function (id) {
                map.set (id, this.get("clmsModel").get("participants").get(id));    
            }, this);
            console.log ("map eq", map == this.get("selectedProtein"));
            // Currently (03/06/16) Maps/Sets don't trigger change functions even for new Objects
            // https://github.com/jashkenas/underscore/issues/2451
            // So need to force change event
            this.set ("selectedProtein", map);
            this.trigger ("change:selectedProtein", this);
            console.log ("map", this.get("selectedProtein"));
        },
        
        getSingleCrosslinkDistance: function (xlink, distancesObj, protAlignCollection) {
            // distancesObj and alignCollection can be supplied to function or, if not present, taken from model
            distancesObj = distancesObj || this.get("clmsModel").get("distancesObj");
            protAlignCollection = protAlignCollection || this.get("alignColl");   
            return distancesObj ? distancesObj.getXLinkDistance (xlink, protAlignCollection, false) : undefined;
        },
        
        getCrossLinkDistances2: function (crossLinks) {
            var distArr = [];
            var distModel = this.get("clmsModel").get("distancesObj");
            var protAlignCollection = this.get ("alignColl");
            for (var crossLink of crossLinks) {
                var dist = this.getSingleCrosslinkDistance (crossLink, distModel, protAlignCollection);
                if (dist != null) {
                    distArr.push(+dist); // + is to stop it being a string
                }
            }
            console.log ("distArr", distArr);

            return distArr;
        }, 
    });
