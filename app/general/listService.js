/*
 * Service for fiddling parameters for NgTable and getting options for dropdown lists from the BE.
 */
angular.module('mip.general', []);

angular.module('mip.general').factory('ListService', [
        '$http', '$q', 'CONFIG', 'locale', "AlertService", "CacheFactory", function($http, $q, CONFIG, locale, AlertService, CacheFactory) {
            // store search terms across pages
            var props = {};

            /*
             * Listaussivuilla näytettävien sarakkeiden oletusnäkyvyys. Jos oletusarvot halutaan muuksi, päivitä logiikka myös resetColumnVisibilities()-metodiin.
             */
            var columns = {
                    'kiinteistot': {
                        'showKuntaCol': true,
                        'showKylaCol': true,
                        'showKiinteistotunnusCol': true,
                        'showKiinteistoNimiCol': true,
                        'showOsoiteCol' : true,
                        'showArvotusCol': true,
                        'showPaikkakuntaCol': true,
                        'showInventointiprojektiCol':false,
                        'showInventoijaCol':true,
                    	'showAddedByCol' : false
                    }, 'rakennukset': {
                        'showKuntaCol': true,
                        'showKylaCol': true,
                        'showKiinteistotunnusCol': true,
                        'showKiinteistoNimiCol': true,
                        'showOsoiteCol' : true,
                        'showArvotusCol': true,
                        'showRakennustunnusCol' : true,
                        'showRakennustyyppiCol': true,
                        'showSuunnittelijaCol': true,
                        'showPaikkakuntaCol': true,
                        'showAddedByCol' : true,
                    	'showRakennustyyppiCol': true,
                    	'showRakennustyypinKuvausCol': false,
                  	  	'showRakennusvuosiCol': false,
                    	'showMuutosvuosiCol': false,
                    	'showRakennusvuosiKuvausCol': false,
                    	'showMuutosvuosiKuvausCol': false,
                    	'showAlkuperainenKayttoCol': false,
                    	'showNykykayttoCol': false,
                    	'showPerustusCol': false,
                    	'showRunkoCol': false,
                    	'showVuorausCol': false,
                    	'showKattoCol': false,
                    	'showKateCol': false,
                    	'showKuntoCol': false,
                    	'showNykytyyliCol': false,
                    	'showPurettuCol': false,
                    	'showKulttuurihistorialliset_arvotCol': false,
                    	'showKuvauksetCol': false
                    }, 'porrashuoneet': {
                        'showKuntaCol': true,
                        'showKylaCol': true,
                        'showKiinteistoNimiCol': true,
                        'showKiinteistotunnusCol': true,
                        'showKiinteistoOsoiteCol': true,
                        'showRakennustyyppiCol': true,
                        'showPorrashuoneentunnusCol': true,
                        'showPorrashuonetyyppiCol': true,
                        'showAddedByCol' : true
                    }, 'alueet': {
                        'showKuntaCol': true,
                        'showKylaCol': true,
                        'showPaikkakuntaCol': true,
                        'showAlueNimiCol': true,
                        'showInventointiprojektiCol':true,
                        'showInventoijaCol':true,
                        'showAddedByCol' : true
                    }, 'arvoalueet': {
                        'showKuntaCol': true,
                        'showKylaCol': true,
                        'showPaikkakuntaCol': true,
                        'showAlueNimiCol': true,
                        'showArvoalueNimiCol': true,
                        'showAluetyyppiCol': true,
                        'showArvotusCol': true,
                        'showInventointiprojektiCol':true,
                        'showInventoijaCol':true,
                        'showAddedByCol' : true
                    }, 'kunnat': { /* Not implemented in kuntaListController.js / kunnat.html */
                        'showKuntaCol': true,
                        'showAddedByCol' : true
                    }, 'kylat': {/* Not implemented in kylaListController.js / kylat.html */
                        'showKuntaCol': true,
                        'showKylaCol': true,
                        'showAddedByCol' : true
                    }, 'suunnittelijat': {
                        'showSuunnittelijaNimiCol': true,
                        'showLajiCol': true,
                        'showAmmattiarvoCol': true,
                        'showAddedByCol' : true
                    }, 'inventointiprojektit': {
                        'showInventointiprojektiNimiCol': true,
                        'showInventointiaikaCol': true,
                        'showToimeksiantajaCol': true,
                        'showInventointiprojektityyppiCol': true,
                        'showInventointiprojektilajiCol': true,
                    	'showAddedByCol' : true
                    }, 'matkaraportit': {
                        'showEtunimiCol': true,
                        'showSukunimiCol': true,
                        'showKiinteistotunnusCol': true,
                        'showKiinteistoNimiCol': true,
                        'showMatkaraportinsyyCol': true,
                        'showMatkapaivaCol': true,
                        'showAddedByCol' : true
                    }, 'raportit': {

                    }, 'kayttajat': {
                        'showEtunimiCol': true,
                        'showSukunimiCol': true,
                        'showSahkopostiCol': true,
                        'showOrganisaatioCol': true,
                        'showAktiivinenCol': true,
                        'showAddedByCol' : true
                    }, 'inventointijulkaisut': {

                    }, 'kohde': {
                    	'showKuntaCol' : true,
                    	'showKylaCol' : true,
                    	'showKohdeNimiCol' : true,
                    	'showKiinteistotunnusCol' : false,
                    	'showKohdeMJTunnusCol' : true,
                    	'showKohdeLajiCol' : true,
                    	'showKohdeTyyppiCol' : true,
                    	'showKohdeTyyppiTarkenneCol' : false,
                    	'showAjoitusCol' : false,
                    	'showAddedByCol' : true,
                    	'showTyhjaCol' : false,
                    	'showVaatiiTarkastustaCol' : false
                    }, 'tutkimus': {
                    	'showTutkimustyyppiCol' : true,
                    	'showTutkimuksenNimiCol' : true,
                    	'showTutkimusLyhenneCol': true,
                    	'showLoytoPaanumeroCol' : true,
                    	'showTutkimusValmisCol' : true,
                    	'showTutkimusJulkinenCol' : true,
                    	'showKenttatyoCol' : true,
                    	'showKenttatyojohtajaCol' : true,
                    }, 'loyto': {
                    	'showLuettelointinumeroCol' : true,
                    	'showMateriaalikoodiCol' : true,
                    	'showAjoitusCol' : true,
                    	'showEnsisijainenMateriaaliCol' : true,
                    	'showMuutMateriaalitCol' : true,
                    	'showTyyppiCol' : true,
                    	'showTyypinTarkenneCol' : true,
                    	'showKuvausCol': true,
                    }, 'loyto_tab': {
                    	'showPaanumeroCol' : true,
                    	'showLuettelointinumeroCol' : true,
                    	'showMateriaalikoodiCol' : true,
                    	'showAjoitusCol' : true,
                    	'showEnsisijainenMateriaaliCol' : true,
                    	'showMuutMateriaalitCol' : true,
                    	'showTyyppiCol' : true,
                    	'showTyypinTarkenneCol' : true,
                    	'showMerkintaCol' : false,
                    	'showTulkintaCol': false,
                    	'showAsiasanaCol': false,
                    	'showLoydonTilaCol': false,
                    	'showTutkimuksenNimiCol': true,
                    	'showTutkimusLyhenneCol': true,
                    	'showYksikkotunnusCol': true,
                    	'showVaatiiKonservointiaCol': false,
                    	'showKuvausCol': false,
                    	'showKokoelmatunnusCol': false,
                    	'showVakituinenSijaintiCol': false,
                        'showHyllypaikkaCol': false,
                        'showTilapainenSijaintiCol': false,
                        'showAlueCol': true,
                        'showLoytopaikanTarkenneCol': false,
                        'showKenttanumeroVanhaTyonumeroCol': false
                    }, 'nayte_tab': {
                    	'showPaanumeroCol' : true,
                    	'showLuettelointinumeroCol' : true,
                    	'showTutkimuksenNimiCol': true,
                    	'showTutkimusLyhenneCol': true,
                    	'showYksikkotunnusCol': true,
                    	'showNaytekoodiCol': true,
                    	'showNaytetyyppiCol': true,
                    	'showNaytettaJaljellaCol': true,
                    	'showVakituinenSijaintiCol': false,
                        'showHyllypaikkaCol': false,
                        'showTilapainenSijaintiCol': false
                    }, 'nayte': {
                    	'showLuettelointinumeroCol' : true,
                    	'showKuvausCol': true,
                    	'showNaytekoodiCol': true,
                    	'showNaytetyyppiCol': true
                    }, 'kasittely_tab': {
                    	'showKasittelytunnusCol' : true,
                    	'showKasittelyAlkaaCol' : true,
                    	'showKasittelyPaattyyCol': true,
                    	'showKasittelyKuvausCol': true
                    }, 'toimenpide_tab': {
                    	'showToimenpideCol' : true,
                    	'showMenetelmaCol' : true,
                    	'showMateriaalitCol': true,
                    	'showAlkaaCol': true,
                    	'showTekijaCol': true,
                    	'showMenetelmanKuvausCol': true,
                    	'showKasittelyCol': true,
                    	'showLisatiedotCol': true
                    }
                };

            CacheFactory('valintaCache', {
                maxAge : 10 * 60 * 1000, // Items added to this cache expire after 10 minutes
                cacheFlushInterval : 60 * 60 * 1000, // This cache will clear itself every hour
                deleteOnExpire : 'passive', // Cache will do nothing when an item expires. Expired items will remain in the cache until requested, at which point they are removed, and undefined is returned.
                capacity : 100
            // Maximum number of items a cache can hold. Adding more items than the capacity will cause the cache to operate like an LRU cache, removing the least recently used items to stay under capacity. Default: Number.MAX_VALUE.
            });

            var listServiceFunctions = {
                setColumnVisibility: function(page, colName, value) {
                    if(columns[page] === undefined) {
                        columns[page] = {colName: false};
                    }
                    if(value === undefined) {
                        value = true;
                    }
                    columns[page][colName] = value;
                    return columns[page][colName];
                },
                getColumnVisibility: function(page, colName) {
                    if(colName !== undefined) {
                        return columns[page][colName];
                    } else {
                        return columns[page];
                    }
                },
                getColumnVisibilities: function(page) {
                	if (page!==undefined) {
                		return columns[page];
                	}
                	else throw "Invalid page (undefined)";
                },
                resetColumnVisibilities : function() {
                    /*
                     * Aseta kaikkien kenttien näkyvyys true:ksi
                     */
                    for(var page in columns) {
                        if(columns.hasOwnProperty(page)) {
                            var p = columns[page];
                            for(var key in p) {
                                if(p.hasOwnProperty(key)) {
                                    p[key] = true;
                                }
                            }
                            /*
                             * Exceptions (should have the same values as the listing on
                             * the top of the page.)
                             * TODO: Tehdään paremmin kun on aikaa
                             */
                            if(page === 'kiinteistot') {
                                p['showInventointiprojektiCol'] = false;
                            	p['showAddedByCol'] = false
                            }
                            if(page === 'rakennukset') {
                                p['showRakennustyypinKuvausCol'] = false;
                                p['showRakennusvuosiCol'] = false;
                                p['showMuutosvuosiCol'] = false;
                                p['showRakennusvuosiKuvausCol'] = false;
                                p['showMuutosvuosiKuvausCol'] = false;
                                p['showAlkuperainenKayttoCol'] = false;
                                p['showNykykayttoCol'] = false;
                                p['showPerustusCol'] = false;
                                p['showRunkoCol'] = false;
                                p['showVuorausCol'] = false;
                                p['showKattoCol'] = false;
                                p['showKuntoCol'] = false;
                                p['showKateCol'] = false;
                                p['showNykytyyliCol'] = false;
                                p['showPurettuCol'] = false;
                                p['showKulttuurihistorialliset_arvotCol'] = false;
                                p['showKuvauksetCol'] = false;
                            }
                            if(page === 'loyto_tab'){
                            	p['showMerkintaCol'] = false;
                            	p['showTulkintaCol'] = false;
                            	p['showAsiasanaCol'] = false;
                            	p['showLoydonTilaCol'] = false;
                            	p['showTutkimuksenNimiCol'] = false;
                            	p['showYksikkotunnusCol'] = false;
                            	p['showVaatiiKonservointiaCol'] = false;
                            	p['showKuvausCol'] = false;
                            	p['showKokoelmatunnusCol'] = false;
                            }
                        }
                    }
                },
                getProp : function(prop) {
                    return props[prop];
                },
                getProps : function() {
                    return props;
                },
                setProp : function(prop, value) {
                    props[prop] = value;
                },
                clearProps : function() {
                    for ( var property in props) {
                        if (props.hasOwnProperty(property)) {
                            props[property] = '';
                        }
                    }
                },
                parseParameters : function(params) {
                    // Create object with the currently selected filters. Used
                    // for generating the url.
                    var object = params.filter();

                    var filterParameters = {
                        rivi : (params.page() - 1) * params.count(),
                        rivit : params.count()
                    };

                    if (object) {
                        for ( var property in object) {
                            if (object.hasOwnProperty(property)) {
                                if (object[property] !== "") {
                                    if (property != "properties") {
                                        var propertyName = property.split('.')[1];
                                        filterParameters[propertyName] = object[property];
                                    } else {
                                        for ( var property2 in object[property]) {
                                            if (object[property].hasOwnProperty(property2)) {
                                                if (object[property][property2] != '') {
                                                    var value = object[property][property2];
                                                    if(value != undefined) {
                                                        filterParameters[property2] = object[property][property2];
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    var sortObject = params.sorting();

                    if (sortObject) {
                        for ( var property in sortObject) {
                            if (sortObject.hasOwnProperty(property)) {
                                if (sortObject[property] !== "") {
                                    var sortBy = property.split('.')[1];
                                    var sortDir;

                                    if (sortObject[property] === 'desc') {
                                        sortDir = 'laskeva';
                                    } else {
                                        sortDir = 'nouseva';
                                    }

                                    filterParameters['jarjestys'] = sortBy;
                                    filterParameters['jarjestys_suunta'] = sortDir;
                                }
                            }
                        }
                    }
                    return filterParameters;
                },
                parseQueryString : function(params) {
                    var queryString = '';
                    // Parse the given parameters and generate url query part of them.
                    for ( var parameter in params) {
                        if (params.hasOwnProperty(parameter)) {
                            if (queryString.length == 0) {
                                queryString = '?' + parameter + "=" + params[parameter];
                            } else {
                                queryString += '&' + parameter + "=" + params[parameter];
                            }
                        }
                    }
                    return queryString;
                },
                getAllOptions : function() {
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + "valinta/";
                    $http({
                        method : 'GET',
                        url : url,
                        cache : CacheFactory.get('valintaCache')
                    }).then(function success(response) {
                        deferred.resolve(response.data.data);
                    }, function error(response) {
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                getOptions : function(category, tyyppi) {
                    /*
                     * Possible categories currently: arvotus, kate, kattotyyppi, kunto, käyttötarkoitus, nykyinen_tyyli, perustus, porrastyyppi, rakennustyyppi, rakentajalaji, rakentajatyyppi, runko, tilatyyppi, vuoraus Possible types: arvoalue, rakennus, kiinteisto
                     */
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + "valinta/" + category;
                    $http({
                        method : 'GET',
                        url : url,
                        params : {
                            'tyyppi' : tyyppi
                        },
                        cache : CacheFactory.get('valintaCache')
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data);
                    }, function errorCallback(response) {
                        AlertService.showError(locale.getString('common.Get_selection_list_failed', {
                            cat : category
                        }));
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                saveListOption : function(category, values) {
                    /*
                     * TODO: Uploading the value. Note the cases of creation or a new and updating existing.
                     */

                },
                deleteListOption : function(category, id) {
                    /*
                     * TODO: Deleting an existing option from the given list (category)
                     */
                },
                getArkOptions : function(category) {
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + category;
                    $http({
                        method : "GET",
                        url : url,
                        cache : CacheFactory.get('valintaCache')
                    }).then(function successCallback(response) {
                        deferred.resolve([
                                category, response.data.data
                        ]);
                    }, function errorCallback(response) {
                        AlertService.showError(locale.getString('common.Get_selection_list_failed', {
                            cat : category
                        }));
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                saveArkListOption : function(category, object) {
                    var deferred = $q.defer();

                    if (object && object.properties.id) {
                        /*
                         * Non-existing options have a fake id with the character '_' in them
                         */
                        if (String(object.properties.id).indexOf("_") == -1) {
                            /*
                             * Update existing
                             */
                            $http({
                                method : "PUT",
                                url : CONFIG.API_URL + category + "/" + object.properties.id,
                                data : object.properties
                            }).then(function success(response) {
                                AlertService.showInfo(locale.getString("common.List_option_saved_successfully"));
                                deferred.resolve(response.data);
                            }, function error(response) {
                                AlertService.showError(locale.getString("common.Error"), locale.getString('common.Saving_list_option_failed'));
                                deferred.reject(response.data);
                            });
                        } else {
                            /*
                             * Create a new one
                             */
                            $http({
                                method : "POST",
                                url : CONFIG.API_URL + category,
                                data : object.properties
                            }).then(function success(response) {
                                AlertService.showInfo(locale.getString("common.List_option_saved_successfully"));
                                deferred.resolve(response.data);
                            }, function error(response) {
                                AlertService.showError(locale.getString("common.Error"), locale.getString('common.Saving_list_option_failed'));
                                deferred.reject(response.data);
                            });
                        }
                    }

                    return deferred.promise;
                },
                deleteArkListOption : function(category, object) {
                    var deferred = $q.defer();

                    if (object && object.properties.id) {
                        /*
                         * Non-existing options have a fake id with the character '_' in them; they don't have to be deleted "for real"
                         */
                        if (String(object.properties.id).indexOf("_") == -1) {
                            $http({
                                method : "DELETE",
                                url : CONFIG.API_URL + category + "/" + object.properties.id
                            }).then(function success(response) {
                                AlertService.showInfo(locale.getString("common.List_option_deleted_successfully"));
                                deferred.resolve(response.data);
                            }, function error(response) {
                                AlertService.showError(locale.getString("common.Error"), locale.getString('common.Deleting_list_option_failed'));
                                deferred.reject(response.data);
                            });
                        }
                    }

                    return deferred.promise;
                },
                getColumnName : function(column, lang_file) {
                    var str;

                    if (lang_file) {
                        str = lang_file + '.' + column;
                    } else {
                        str = 'common.' + column;
                    }

                    return locale.getString(str);
                },
                /*
                 * Return 0 for no, 1 for yes and show localized string. Can be used in dropdown lists.
                 */
                getNoYes : function() {
                    var options = [
                            {
                                value : false,
                                label : locale.getString('common.No')
                            }, {
                                value : true,
                                label : locale.getString('common.Yes')
                            }
                    ];

                    return options;
                },
                getTalteenottotavat : function() {
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + "talteenottotapa/";
                    $http({
                        method : 'GET',
                        url : url,
                        cache : CacheFactory.get('valintaCache')
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        AlertService.showError(locale.getString('common.Get_selection_list_failed', {
                            cat : 'talteenottotapa'
                        }));
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                getYksikonElinkaaret : function() {
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + "yksikon_elinkaari/";
                    $http({
                        method : 'GET',
                        url : url,
                        cache : CacheFactory.get('valintaCache')
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        AlertService.showError(locale.getString('common.Get_selection_list_failed', {
                            cat : 'yksikon_elinkaari'
                        }));
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                getAsiasanat : function() {
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + "asiasana/";
                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        AlertService.showError(locale.getString('common.Get_selection_list_failed', {
                            cat : 'asiasana'
                        }));
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                queryAsiasana : function(hakusana, kieli) {
                    var deferred = $q.defer();
                    var lang = '';
                    if (!kieli) {
                        lang = 'fi';
                    } else {
                        lang = kieli;
                    }
                    // Rajoitettu hakusanan minimiksi 2 merkkiä
                    if (hakusana == null || hakusana.length < 3) {
                        deferred.reject();
                    } else {
                        // var url = "http://api.finto.fi/rest/v1/maotao/search?lang=" + lang + "&query=" + hakusana;
                        var url = CONFIG.API_URL + "finto/maotao/" + lang + "/" + hakusana + "*";
                        $http({
                            method : 'GET',
                            url : url
                        }).then(function successCallback(response) {
                            // We probably only want the word(s), not everything Finto returns, so do some filtering here
                            var results = response.data.results;
                            var ret = [];

                            for (var i = 0; i < results.length; i++) {
                                var result = results[i];

                                if (result.prefLabel.toLowerCase().indexOf(hakusana.toLowerCase()) > -1) {
                                    ret.push(result.prefLabel);
                                }
                            }
                            deferred.resolve(ret);
                        }, function errorCallback(response) {

                        	AlertService.showError(locale.getString('common.Error'), locale.getString('common.Finto_glossary_error'));
                            deferred.reject(response);
                        });
                    }

                    return deferred.promise;
                },
                saveKiinteistoSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('kii_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('kii_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('kii_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('kii_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('kii_jarjestys_suunta', "");
                    }
                    if (filterParameters.kuntaId) {
                        listServiceFunctions.setProp('kuntaId', filterParameters.kuntaId);
                    } else {
                        listServiceFunctions.setProp('kuntaId', "");
                    }
                    if (filterParameters.kylaId) {
                        listServiceFunctions.setProp('kylaId', filterParameters.kylaId);
                    } else {
                        listServiceFunctions.setProp('kylaId', "");
                    }
                    if (filterParameters.kiinteistotunnus) {
                        listServiceFunctions.setProp('kiinteistotunnus', filterParameters.kiinteistotunnus);
                    } else {
                        listServiceFunctions.setProp('kiinteistotunnus', "");
                    }

                    if (filterParameters.nimi) {
                        listServiceFunctions.setProp('kiinteistoNimi', filterParameters.nimi);
                    } else {
                        listServiceFunctions.setProp('kiinteistoNimi', "");
                    }

                    if (filterParameters.osoite) {
                        listServiceFunctions.setProp('osoite', filterParameters.osoite);
                    } else {
                        listServiceFunctions.setProp('osoite', "");
                    }

                    if (filterParameters.arvotus) {
                        listServiceFunctions.setProp('arvotus', filterParameters.arvotus);
                    } else {
                        listServiceFunctions.setProp('arvotus', "");
                    }
                    if (filterParameters.paikkakunta) {
                        listServiceFunctions.setProp('paikkakunta', filterParameters.paikkakunta);
                    } else {
                        listServiceFunctions.setProp('paikkakunta', "");
                    }
                    if (filterParameters.palstanumero) {
                        listServiceFunctions.setProp('palstanumero', filterParameters.palstanumero);
                    } else {
                        listServiceFunctions.setProp('palstanumero', "");
                    }
                    if (filterParameters.inventointiprojektiId) {
                        listServiceFunctions.setProp('inventointiprojektiId', filterParameters.inventointiprojektiId);
                    } else {
                        listServiceFunctions.setProp('inventointiprojektiId', "");
                    }
                    if (filterParameters.inventoija) {
                        listServiceFunctions.setProp('inventoija', filterParameters.inventoija);
                    } else {
                        listServiceFunctions.setProp('inventoija', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveRakennusSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('rak_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('rak_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('rak_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('rak_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('rak_jarjestys_suunta', "");
                    }
                    if (filterParameters.kuntaId) {
                        listServiceFunctions.setProp('kuntaId', filterParameters.kuntaId);
                    } else {
                        listServiceFunctions.setProp('kuntaId', "");
                    }
                    if (filterParameters.kylaId) {
                        listServiceFunctions.setProp('kylaId', filterParameters.kylaId);
                    } else {
                        listServiceFunctions.setProp('kylaId', "");
                    }
                    if (filterParameters.kiinteistotunnus) {
                        listServiceFunctions.setProp('kiinteistotunnus', filterParameters.kiinteistotunnus);
                    } else {
                        listServiceFunctions.setProp('kiinteistotunnus', "");
                    }

                    if (filterParameters.kiinteisto_nimi) {
                        listServiceFunctions.setProp('kiinteistoNimi', filterParameters.kiinteisto_nimi);
                    } else {
                        listServiceFunctions.setProp('kiinteistoNimi', "");
                    }

                    if (filterParameters.rakennus_osoite) {
                        listServiceFunctions.setProp('osoite', filterParameters.rakennus_osoite);
                    } else {
                        listServiceFunctions.setProp('osoite', "");
                    }

                    if (filterParameters.arvotus) {
                        listServiceFunctions.setProp('arvotus', filterParameters.arvotus);
                    } else {
                        listServiceFunctions.setProp('arvotus', "");
                    }

                    if (filterParameters.rakennustyyppi) {
                        listServiceFunctions.setProp('rakennustyyppi', filterParameters.rakennustyyppi);
                    } else {
                        listServiceFunctions.setProp('rakennustyyppi', "");
                    }

                    if (filterParameters.suunnittelija) {
                        listServiceFunctions.setProp('suunnittelija', filterParameters.suunnittelija);
                    } else {
                        listServiceFunctions.setProp('suunnittelija', "");
                    }
                    if (filterParameters.palstanumero) {
                        listServiceFunctions.setProp('palstanumero', filterParameters.palstanumero);
                    } else {
                        listServiceFunctions.setProp('palstanumero', "");
                    }
                    if (filterParameters.paikkakunta) {
                        listServiceFunctions.setProp('paikkakunta', filterParameters.paikkakunta);
                    } else {
                        listServiceFunctions.setProp('paikkakunta', "");
                    }
                    if (filterParameters.inventointiprojektiId) {
                        listServiceFunctions.setProp('inventointiprojektiId', filterParameters.inventointiprojektiId);
                    } else {
                        listServiceFunctions.setProp('inventointiprojektiId', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                    if (filterParameters.rakennustunnus) {
                        listServiceFunctions.setProp('rakennustunnus', filterParameters.rakennustunnus);
                    } else {
                        listServiceFunctions.setProp('rakennustunnus', "");
                    }
                    if (filterParameters.rakennustyypin_kuvaus) {
                        listServiceFunctions.setProp('rakennustyypin_kuvaus', filterParameters.rakennustyypin_kuvaus);
                    } else {
                        listServiceFunctions.setProp('rakennustyypin_kuvaus', "");
                    }
                    if (filterParameters.rakennusvuosi_alku) {
                        listServiceFunctions.setProp('rakennusvuosi_alku', filterParameters.rakennusvuosi_alku);
                    } else {
                        listServiceFunctions.setProp('rakennusvuosi_alku', "");
                    }
                    if (filterParameters.rakennusvuosi_lopetus) {
                        listServiceFunctions.setProp('rakennusvuosi_lopetus', filterParameters.rakennusvuosi_lopetus);
                    } else {
                        listServiceFunctions.setProp('rakennusvuosi_lopetus', "");
                    }
                    if (filterParameters.muutosvuosi_alku) {
                        listServiceFunctions.setProp('muutosvuosi_alku', filterParameters.muutosvuosi_alku);
                    } else {
                        listServiceFunctions.setProp('muutosvuosi_alku', "");
                    }
                    if (filterParameters.muutosvuosi_lopetus) {
                        listServiceFunctions.setProp('muutosvuosi_lopetus', filterParameters.muutosvuosi_lopetus);
                    } else {
                        listServiceFunctions.setProp('muutosvuosi_lopetus', "");
                    }
                    if (filterParameters.rakennusvuosi_kuvaus) {
                        listServiceFunctions.setProp('rakennusvuosi_kuvaus', filterParameters.rakennusvuosi_kuvaus);
                    } else {
                        listServiceFunctions.setProp('rakennusvuosi_kuvaus', "");
                    }
                    if (filterParameters.muutosvuosi_kuvaus) {
                        listServiceFunctions.setProp('muutosvuosi_kuvaus', filterParameters.muutosvuosi_kuvaus);
                    } else {
                        listServiceFunctions.setProp('muutosvuosi_kuvaus', "");
                    }
                    if (filterParameters.muutosvuosi_kuvaus) {
                        listServiceFunctions.setProp('muutosvuosi_kuvaus', filterParameters.muutosvuosi_kuvaus);
                    } else {
                        listServiceFunctions.setProp('muutosvuosi_kuvaus', "");
                    }
                    if (filterParameters.alkuperainen_kaytto) {
                        listServiceFunctions.setProp('alkuperainen_kaytto', filterParameters.alkuperainen_kaytto);
                    } else {
                        listServiceFunctions.setProp('alkuperainen_kaytto', "");
                    }
                    if (filterParameters.nykykaytto) {
                        listServiceFunctions.setProp('nykykaytto', filterParameters.nykykaytto);
                    } else {
                        listServiceFunctions.setProp('nykykaytto', "");
                    }
                    if (filterParameters.perustus) {
                        listServiceFunctions.setProp('perustus', filterParameters.perustus);
                    } else {
                        listServiceFunctions.setProp('perustus', "");
                    }
                    if (filterParameters.runko) {
                        listServiceFunctions.setProp('runko', filterParameters.runko);
                    } else {
                        listServiceFunctions.setProp('runko', "");
                    }
                    if (filterParameters.vuoraus) {
                        listServiceFunctions.setProp('vuoraus', filterParameters.vuoraus);
                    } else {
                        listServiceFunctions.setProp('vuoraus', "");
                    }
                    if (filterParameters.katto) {
                        listServiceFunctions.setProp('katto', filterParameters.katto);
                    } else {
                        listServiceFunctions.setProp('katto', "");
                    }
                    if (filterParameters.kate) {
                        listServiceFunctions.setProp('kate', filterParameters.kate);
                    } else {
                        listServiceFunctions.setProp('kate', "");
                    }
                    if (filterParameters.kunto) {
                        listServiceFunctions.setProp('kunto', filterParameters.kunto);
                    } else {
                        listServiceFunctions.setProp('kunto', "");
                    }
                    if (filterParameters.nykytyyli) {
                        listServiceFunctions.setProp('nykytyyli', filterParameters.nykytyyli);
                    } else {
                        listServiceFunctions.setProp('nykytyyli', "");
                    }
                    if (filterParameters.purettu) {
                        listServiceFunctions.setProp('purettu', filterParameters.purettu);
                    } else {
                        listServiceFunctions.setProp('purettu', "");
                    }
                    if (filterParameters.kulttuurihistorialliset_arvot) {
                        listServiceFunctions.setProp('kulttuurihistorialliset_arvot', filterParameters.kulttuurihistorialliset_arvot);
                    } else {
                        listServiceFunctions.setProp('kulttuurihistorialliset_arvot', "");
                    }
                    if (filterParameters.kuvaukset) {
                        listServiceFunctions.setProp('kuvaukset', filterParameters.kuvaukset);
                    } else {
                        listServiceFunctions.setProp('kuvaukset', "");
                    }
                },
                savePorrashuoneSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('por_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('por_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('por_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('por_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('por_jarjestys_suunta', "");
                    }
                    if (filterParameters.kuntaId) {
                        listServiceFunctions.setProp('kuntaId', filterParameters.kuntaId);
                    } else {
                        listServiceFunctions.setProp('kuntaId', "");
                    }
                    if (filterParameters.kylaId) {
                        listServiceFunctions.setProp('kylaId', filterParameters.kylaId);
                    } else {
                        listServiceFunctions.setProp('kylaId', "");
                    }

                    if (filterParameters.kiinteisto_nimi) {
                        listServiceFunctions.setProp('kiinteistoNimi', filterParameters.kiinteisto_nimi);
                    } else {
                        listServiceFunctions.setProp('kiinteistoNimi', "");
                    }

                    if (filterParameters.kiinteisto_osoite) {
                        listServiceFunctions.setProp('osoite', filterParameters.kiinteisto_osoite);
                    } else {
                        listServiceFunctions.setProp('osoite', "");
                    }

                    if (filterParameters.rakennus_tyyppi) {
                        listServiceFunctions.setProp('rakennustyyppi', filterParameters.rakennus_tyyppi);
                    } else {
                        listServiceFunctions.setProp('rakennustyyppi', "");
                    }

                    if (filterParameters.tunnus) {
                        listServiceFunctions.setProp('porrashuoneenTunnus', filterParameters.tunnus);
                    } else {
                        listServiceFunctions.setProp('porrashuoneenTunnus', "");
                    }
                    if (filterParameters.palstanumero) {
                        listServiceFunctions.setProp('palstanumero', filterParameters.palstanumero);
                    } else {
                        listServiceFunctions.setProp('palstanumero', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveAlueSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('alu_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('alu_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('alu_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('alu_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('alu_jarjestys_suunta', "");
                    }
                    if (filterParameters.kuntaId) {
                        listServiceFunctions.setProp('kuntaId', filterParameters.kuntaId);
                    } else {
                        listServiceFunctions.setProp('kuntaId', "");
                    }
                    if (filterParameters.kylaId) {
                        listServiceFunctions.setProp('kylaId', filterParameters.kylaId);
                    } else {
                        listServiceFunctions.setProp('kylaId', "");
                    }
                    if (filterParameters.nimi) {
                        listServiceFunctions.setProp('alueNimi', filterParameters.nimi);
                    } else {
                        listServiceFunctions.setProp('alueNimi', "");
                    }
                    if (filterParameters.paikkakunta) {
                        listServiceFunctions.setProp('paikkakunta', filterParameters.paikkakunta);
                    } else {
                        listServiceFunctions.setProp('paikkakunta', "");
                    }
                    if (filterParameters.inventointiprojektiId) {
                        listServiceFunctions.setProp('inventointiprojektiId', filterParameters.inventointiprojektiId);
                    } else {
                        listServiceFunctions.setProp('inventointiprojektiId', "");
                    }
                    if (filterParameters.inventoija) {
                        listServiceFunctions.setProp('inventoija', filterParameters.inventoija);
                    } else {
                        listServiceFunctions.setProp('inventoija', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveArvoalueSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('arv_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('arv_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('arv_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('arv_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('arv_jarjestys_suunta', "");
                    }
                    if (filterParameters.kuntaId) {
                        listServiceFunctions.setProp('kuntaId', filterParameters.kuntaId);
                    } else {
                        listServiceFunctions.setProp('kuntaId', "");
                    }
                    if (filterParameters.kylaId) {
                        listServiceFunctions.setProp('kylaId', filterParameters.kylaId);
                    } else {
                        listServiceFunctions.setProp('kylaId', "");
                    }
                    if (filterParameters.alue_nimi) {
                        listServiceFunctions.setProp('alueNimi', filterParameters.alue_nimi);
                    } else {
                        listServiceFunctions.setProp('alueNimi', "");
                    }

                    if (filterParameters.nimi) {
                        listServiceFunctions.setProp('arvoalueNimi', filterParameters.nimi);
                    } else {
                        listServiceFunctions.setProp('arvoalueNimi', "");
                    }

                    if (filterParameters.arvotus) {
                        listServiceFunctions.setProp('arvotus', filterParameters.arvotus);
                    } else {
                        listServiceFunctions.setProp('arvotus', "");
                    }

                    if (filterParameters.aluetyyppi) {
                        listServiceFunctions.setProp('aluetyyppi', filterParameters.aluetyyppi);
                    } else {
                        listServiceFunctions.setProp('aluetyyppi', "");
                    }
                    if (filterParameters.paikkakunta) {
                        listServiceFunctions.setProp('paikkakunta', filterParameters.paikkakunta);
                    } else {
                        listServiceFunctions.setProp('paikkakunta', "");
                    }
                    if (filterParameters.inventointiprojektiId) {
                        listServiceFunctions.setProp('inventointiprojektiId', filterParameters.inventointiprojektiId);
                    } else {
                        listServiceFunctions.setProp('inventointiprojektiId', "");
                    }
                    if (filterParameters.inventoija) {
                        listServiceFunctions.setProp('inventoija', filterParameters.inventoija);
                    } else {
                        listServiceFunctions.setProp('inventoija', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveKuntaSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('kun_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('kun_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('kun_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('kun_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('kun_jarjestys_suunta', "");
                    }
                    if (filterParameters.kuntaId) {
                        listServiceFunctions.setProp('kuntaId', filterParameters.kuntaId);
                    } else {
                        listServiceFunctions.setProp('kuntaId', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveKylaSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('kyl_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('kyl_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('kyl_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('kyl_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('kyl_jarjestys_suunta', "");
                    }
                    if (filterParameters.kuntaId) {
                        listServiceFunctions.setProp('kuntaId', filterParameters.kuntaId);
                    } else {
                        listServiceFunctions.setProp('kuntaId', "");
                    }
                    if (filterParameters.kylaId) {
                        listServiceFunctions.setProp('kylaId', filterParameters.kylaId);
                    } else {
                        listServiceFunctions.setProp('kylaId', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveSuunnittelijaSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('suu_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('suu_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('suu_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('suu_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('suu_jarjestys_suunta', "");
                    }
                    if (filterParameters.laji) {
                        listServiceFunctions.setProp('suunnittelijaLaji', filterParameters.laji);
                    } else {
                        listServiceFunctions.setProp('suunnittelijaLaji', "");
                    }
                    if (filterParameters.ammattiarvo) {
                        listServiceFunctions.setProp('ammattiarvo', filterParameters.ammattiarvo);
                    } else {
                        listServiceFunctions.setProp('ammattiarvo', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveInventointiprojektiSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('inv_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('inv_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('inv_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('inv_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('inv_jarjestys_suunta', "");
                    }
                    if (filterParameters.nimi) {
                        listServiceFunctions.setProp('inventointiprojektiNimi', filterParameters.nimi);
                    } else {
                        listServiceFunctions.setProp('inventointiprojektiNimi', "");
                    }

                    if (filterParameters.inventointiaika_aloitus) {
                        listServiceFunctions.setProp('inventointiaika_aloitus', filterParameters.inventointiaika_aloitus);
                    } else {
                        listServiceFunctions.setProp('inventointiaika_aloitus', "");
                    }

                    if (filterParameters.inventointiaika_lopetus) {
                        listServiceFunctions.setProp('inventointiaika_lopetus', filterParameters.inventointiaika_lopetus);
                    } else {
                        listServiceFunctions.setProp('inventointiaika_lopetus', "");
                    }

                    if (filterParameters.toimeksiantaja) {
                        listServiceFunctions.setProp('toimeksiantaja', filterParameters.toimeksiantaja);
                    } else {
                        listServiceFunctions.setProp('toimeksiantaja', "");
                    }

                    if (filterParameters.inventointiprojektityyppi) {
                        listServiceFunctions.setProp('inventointiprojektityyppi', filterParameters.inventointiprojektityyppi);
                    } else {
                        listServiceFunctions.setProp('inventointiprojektityyppi', "");
                    }

                    if (filterParameters.inventointiprojektityyppi) {
                        listServiceFunctions.setProp('inventointiprojektilaji', filterParameters.inventointiprojektilaji);
                    } else {
                        listServiceFunctions.setProp('inventointiprojektilaji', "");
                    }


                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveKayttajaSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('kay_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('kay_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('kay_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('kay_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('kay_jarjestys_suunta', "");
                    }
                    if (filterParameters.etunimi) {
                        listServiceFunctions.setProp('kayttajaEtunimi', filterParameters.etunimi);
                    } else {
                        listServiceFunctions.setProp('kayttajaEtunimi', "");
                    }
                    if (filterParameters.sukunimi) {
                        listServiceFunctions.setProp('kayttajaSukunimi', filterParameters.sukunimi);
                    } else {
                        listServiceFunctions.setProp('kayttajaSukunimi', "");
                    }
                    if (filterParameters.sahkoposti) {
                        listServiceFunctions.setProp('sahkoposti', filterParameters.sahkoposti);
                    } else {
                        listServiceFunctions.setProp('sahkoposti', "");
                    }
                    if (filterParameters.organisaatio) {
                        listServiceFunctions.setProp('organisaatio', filterParameters.organisaatio);
                    } else {
                        listServiceFunctions.setProp('organisaatio', "");
                    }
                    if (filterParameters.aktiivinen) {
                        listServiceFunctions.setProp('aktiivinen', filterParameters.aktiivinen);
                    } else {
                        listServiceFunctions.setProp('aktiivinen', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveInventointijulkaisuSearchParameters : function(filterParameters) {
                    if (filterParameters.nimi) {
                        listServiceFunctions.setProp('inventointijulkaisunimi', filterParameters.nimi);
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                saveMatkaraporttiSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('mat_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('mat_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('mat_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('mat_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('mat_jarjestys_suunta', "");
                    }
                    if (filterParameters.etunimi) {
                        listServiceFunctions.setProp('kayttajaEtunimi', filterParameters.etunimi);
                    } else {
                        listServiceFunctions.setProp('kayttajaEtunimi', "");
                    }
                    if (filterParameters.sukunimi) {
                        listServiceFunctions.setProp('kayttajaSukunimi', filterParameters.sukunimi);
                    } else {
                        listServiceFunctions.setProp('kayttajaSukunimi', "");
                    }

                    if (filterParameters.kiinteistotunnus) {
                        listServiceFunctions.setProp('kiinteistotunnus', filterParameters.kiinteistotunnus);
                    } else {
                        listServiceFunctions.setProp('kiinteistotunnus', "");
                    }
                    if (filterParameters.kiinteistoNimi) {
                        listServiceFunctions.setProp('kiinteistoNimi', filterParameters.kiinteistoNimi);
                    } else {
                        listServiceFunctions.setProp('kiinteistoNimi', "");
                    }

                    if (filterParameters.syy) {
                        listServiceFunctions.setProp('matkaraportinSyy', filterParameters.syy);
                    } else {
                        listServiceFunctions.setProp('matkaraportinSyy', "");
                    }

                    if (filterParameters.matkapvm_aloitus) {
                        listServiceFunctions.setProp('matkapvm_aloitus', filterParameters.matkapvm_aloitus);
                    } else {
                        listServiceFunctions.setProp('matkapvm_aloitus', "");
                    }

                    if (filterParameters.matkapvm_lopetus) {
                        listServiceFunctions.setProp('matkapvm_lopetus', filterParameters.matkapvm_lopetus);
                    } else {
                        listServiceFunctions.setProp('matkapvm_lopetus', "");
                    }
                    if (filterParameters.palstanumero) {
                        listServiceFunctions.setProp('palstanumero', filterParameters.palstanumero);
                    } else {
                        listServiceFunctions.setProp('palstanumero', "");
                    }
                    if (filterParameters.luoja) {
                        listServiceFunctions.setProp('luoja', filterParameters.luoja);
                    } else {
                        listServiceFunctions.setProp('luoja', "");
                    }
                },
                // ARK löytö tab
                saveLoytoSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('loy_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('loy_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('loy_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('loy_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('loy_jarjestys_suunta', "");
                    }
                    if (filterParameters.loyto_paanumero) {
                        listServiceFunctions.setProp('loyto_paanumero', filterParameters.loyto_paanumero);
                    } else {
                        listServiceFunctions.setProp('loyto_paanumero', "");
                    }
                    if (filterParameters.materiaalikoodit) {
                        listServiceFunctions.setProp('materiaalikoodit', filterParameters.materiaalikoodit);
                    } else {
                        listServiceFunctions.setProp('materiaalikoodit', "");
                    }
                    if (filterParameters.ensisijaiset_materiaalit) {
                        listServiceFunctions.setProp('ensisijaiset_materiaalit', filterParameters.ensisijaiset_materiaalit);
                    } else {
                        listServiceFunctions.setProp('ensisijaiset_materiaalit', "");
                    }
                    if (filterParameters.materiaalit) {
                        listServiceFunctions.setProp('materiaalit', filterParameters.materiaalit);
                    } else {
                        listServiceFunctions.setProp('materiaalit', "");
                    }
                    if (filterParameters.luettelointinumero) {
                        listServiceFunctions.setProp('luettelointinumero', filterParameters.luettelointinumero);
                    } else {
                        listServiceFunctions.setProp('luettelointinumero', "");
                    }
                    if (filterParameters.loytotyypit) {
                        listServiceFunctions.setProp('loytotyypit', filterParameters.loytotyypit);
                    } else {
                        listServiceFunctions.setProp('loytotyypit', "");
                    }
                    if (filterParameters.loytotyyppi_tarkenteet) {
                        listServiceFunctions.setProp('loytotyyppi_tarkenteet', filterParameters.loytotyyppi_tarkenteet);
                    } else {
                        listServiceFunctions.setProp('loytotyyppi_tarkenteet', "");
                    }
                    if (filterParameters.valittu_ajoitus) {
                        listServiceFunctions.setProp('valittu_ajoitus', filterParameters.valittu_ajoitus);
                    } else {
                        listServiceFunctions.setProp('valittu_ajoitus', 3);
                    }
                    if (filterParameters.tutkimuksen_nimi) {
                        listServiceFunctions.setProp('tutkimuksen_nimi', filterParameters.tutkimuksen_nimi);
                    } else {
                        listServiceFunctions.setProp('tutkimuksen_nimi', "");
                    }
                    if (filterParameters.tutkimusLyhenne) {
                        listServiceFunctions.setProp('tutkimusLyhenne', filterParameters.tutkimusLyhenne);
                    } else {
                        listServiceFunctions.setProp('tutkimusLyhenne', "");
                    }
                    if (filterParameters.yksikkotunnus) {
                        listServiceFunctions.setProp('yksikkotunnus', filterParameters.yksikkotunnus);
                    } else {
                        listServiceFunctions.setProp('yksikkotunnus', "");
                    }
                    if (filterParameters.merkinnat) {
                        listServiceFunctions.setProp('merkinnat', filterParameters.merkinnat);
                    } else {
                        listServiceFunctions.setProp('merkinnat', "");
                    }
                    if (filterParameters.tulkinta) {
                        listServiceFunctions.setProp('tulkinta', filterParameters.tulkinta);
                    } else {
                        listServiceFunctions.setProp('tulkinta', "");
                    }
                    if (filterParameters.loydon_asiasanat) {
                        listServiceFunctions.setProp('loydon_asiasanat', filterParameters.loydon_asiasanat);
                    } else {
                        listServiceFunctions.setProp('loydon_asiasanat', "");
                    }
                    if (filterParameters.loydon_tilat) {
                        listServiceFunctions.setProp('loydon_tilat', filterParameters.loydon_tilat);
                    } else {
                        listServiceFunctions.setProp('loydon_tilat', "");
                    }
                    if (filterParameters.vaatii_konservointia) {
                        listServiceFunctions.setProp('vaatii_konservointia', filterParameters.vaatii_konservointia);
                    } else {
                        listServiceFunctions.setProp('vaatii_konservointia', 4);
                    }
                    if (filterParameters.kuvaus) {
                        listServiceFunctions.setProp('kuvaus', filterParameters.kuvaus);
                    } else {
                        listServiceFunctions.setProp('kuvaus', "");
                    }
                    if (filterParameters.lisatiedot) {
                        listServiceFunctions.setProp('lisatiedot', filterParameters.lisatiedot);
                    } else {
                        listServiceFunctions.setProp('lisatiedot', "");
                    }
                    if (filterParameters.alkuvuosi) {
                        listServiceFunctions.setProp('alkuvuosi', filterParameters.alkuvuosi);
                    } else {
                        listServiceFunctions.setProp('alkuvuosi', "");
                    }
                    if (filterParameters.alkuvuosi_ajanlasku) {
                        listServiceFunctions.setProp('alkuvuosi_ajanlasku', filterParameters.alkuvuosi_ajanlasku);
                    } else {
                        listServiceFunctions.setProp('alkuvuosi_ajanlasku', null);
                    }
                    if (filterParameters.paatosvuosi) {
                        listServiceFunctions.setProp('paatosvuosi', filterParameters.paatosvuosi);
                    } else {
                        listServiceFunctions.setProp('paatosvuosi', "");
                    }
                    if (filterParameters.paatosvuosi_ajanlasku) {
                        listServiceFunctions.setProp('paatosvuosi_ajanlasku', filterParameters.paatosvuosi_ajanlasku);
                    } else {
                        listServiceFunctions.setProp('paatosvuosi_ajanlasku', null);
                    }
                    if(filterParameters.loyto_alue) {
                    	listServiceFunctions.setProp('loyto_alue', filterParameters.loyto_alue);
                    } else {
                    	listServiceFunctions.setProp('loyto_alue', null);
                    }
                    if (filterParameters.loytopaikan_tarkenne) {
                        listServiceFunctions.setProp('loytopaikan_tarkenne', filterParameters.loytopaikan_tarkenne);
                    } else {
                        listServiceFunctions.setProp('loytopaikan_tarkenne', "");
                    }
                    if (filterParameters.kenttanumero_vanha_tyonumero) {
                        listServiceFunctions.setProp('kenttanumero_vanha_tyonumero', filterParameters.kenttanumero_vanha_tyonumero);
                    } else {
                        listServiceFunctions.setProp('kenttanumero_vanha_tyonumero', "");
                    }
                    if (filterParameters.sailytystila) {
                        listServiceFunctions.setProp('sailytystila', filterParameters.sailytystila);
                    } else {
                        listServiceFunctions.setProp('sailytystila', "");
                    }
                },
                // ARK näyte tab TODO vaihda päällekkäiset propparinimet!!!
                saveNayteSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('nay_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('nay_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('nay_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('nay_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('nay_jarjestys_suunta', "");
                    }
                    if (filterParameters.nayte_paanumero) {
                        listServiceFunctions.setProp('nayte_paanumero', filterParameters.nayte_paanumero);
                    } else {
                        listServiceFunctions.setProp('nayte_paanumero', "");
                    }
                    if (filterParameters.luettelointinumero) {
                        listServiceFunctions.setProp('nayte_luettelointinumero', filterParameters.luettelointinumero);
                    } else {
                        listServiceFunctions.setProp('nayte_luettelointinumero', "");
                    }
                    if (filterParameters.tutkimuksen_nimi) {
                        listServiceFunctions.setProp('nayte_tutkimuksen_nimi', filterParameters.tutkimuksen_nimi);
                    } else {
                        listServiceFunctions.setProp('nayte_tutkimuksen_nimi', "");
                    }
                    if (filterParameters.tutkimusLyhenne) {
                        listServiceFunctions.setProp('nayte_tutkimusLyhenne', filterParameters.tutkimusLyhenne);
                    } else {
                        listServiceFunctions.setProp('nayte_tutkimusLyhenne', "");
                    }
                    if (filterParameters.yksikkotunnus) {
                        listServiceFunctions.setProp('nayte_yksikkotunnus', filterParameters.yksikkotunnus);
                    } else {
                        listServiceFunctions.setProp('nayte_yksikkotunnus', "");
                    }
                    if (filterParameters.naytekoodit) {
                        listServiceFunctions.setProp('naytekoodit', filterParameters.naytekoodit);
                    } else {
                        listServiceFunctions.setProp('naytekoodit', "");
                    }
                    if (filterParameters.naytetyypit) {
                        listServiceFunctions.setProp('naytetyypit', filterParameters.naytetyypit);
                    } else {
                        listServiceFunctions.setProp('naytetyypit', "");
                    }
                    if (filterParameters.naytetta_jaljella) {
                        listServiceFunctions.setProp('naytetta_jaljella', filterParameters.naytetta_jaljella);
                    } else {
                        listServiceFunctions.setProp('naytetta_jaljella', "");
                    }
                    //tarkennettu haku
                    if (filterParameters.kuvaus) {
                        listServiceFunctions.setProp('nayte_kuvaus', filterParameters.kuvaus);
                    } else {
                        listServiceFunctions.setProp('nayte_kuvaus', "");
                    }
                    if (filterParameters.lisatiedot) {
                        listServiceFunctions.setProp('nayte_lisatiedot', filterParameters.lisatiedot);
                    } else {
                        listServiceFunctions.setProp('nayte_lisatiedot', "");
                    }
                    if (filterParameters.naytteen_tilat) {
                        listServiceFunctions.setProp('naytteen_tilat', filterParameters.naytteen_tilat);
                    } else {
                        listServiceFunctions.setProp('naytteen_tilat', "");
                    }
                    if (filterParameters.luokka) {
                        listServiceFunctions.setProp('luokka', filterParameters.luokka);
                    } else {
                        listServiceFunctions.setProp('luokka', "");
                    }
                    if (filterParameters.sailytystila) {
                        listServiceFunctions.setProp('sailytystila', filterParameters.sailytystila);
                    } else {
                        listServiceFunctions.setProp('sailytystila', "");
                    }
                },
                saveKasittelytSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('kas_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('kas_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('kas_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('kas_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('kas_jarjestys_suunta', "");
                    }
                    if (filterParameters.kasittelytunnus) {
                        listServiceFunctions.setProp('kasittelytunnus', filterParameters.kasittelytunnus);
                    } else {
                        listServiceFunctions.setProp('kasittelytunnus', "");
                    }
                    if (filterParameters.valittu_paattyminen) {
                        listServiceFunctions.setProp('valittu_paattyminen', filterParameters.valittu_paattyminen);
                    } else {
                        listServiceFunctions.setProp('valittu_paattyminen', 1);
                    }
                },
                saveTutkimuksetSearchParameters : function(filterParameters) {
                    if (filterParameters.jarjestys) {
                        listServiceFunctions.setProp('tut_jarjestys', 'properties.'.concat(filterParameters.jarjestys));
                    } else {
                        listServiceFunctions.setProp('tut_jarjestys', "");
                    }
                    if (filterParameters.jarjestys_suunta) {
                    	if(filterParameters.jarjestys_suunta === 'nouseva'){
                    		listServiceFunctions.setProp('tut_jarjestys_suunta', 'asc');
                    	}else{
                    		listServiceFunctions.setProp('tut_jarjestys_suunta', 'desc');
                    	}
                    } else {
                        listServiceFunctions.setProp('tut_jarjestys_suunta', "");
                    }
                    if (filterParameters.tutkimuslajit) {
                        listServiceFunctions.setProp('tutkimuslajit', filterParameters.tutkimuslajit);
                    } else {
                        listServiceFunctions.setProp('tutkimuslajit', "");
                    }
                    if (filterParameters.tutkimuksen_nimi) {
                        listServiceFunctions.setProp('tut_nimi', filterParameters.tutkimuksen_nimi);
                    } else {
                        listServiceFunctions.setProp('tut_nimi', "");
                    }
                    if (filterParameters.tutkimusLyhenne) {
                        listServiceFunctions.setProp('tutkimusLyhenne', filterParameters.tutkimusLyhenne);
                    } else {
                        listServiceFunctions.setProp('tutkimusLyhenne', "");
                    }
                    if (filterParameters.loyto_paanumero) {
                        listServiceFunctions.setProp('loyto_paanumero', filterParameters.loyto_paanumero);
                    } else {
                        listServiceFunctions.setProp('loyto_paanumero', "");
                    }
                    if (filterParameters.tutkimus_valmis) {
                        listServiceFunctions.setProp('tutkimus_valmis', filterParameters.tutkimus_valmis);
                    } else {
                        listServiceFunctions.setProp('tutkimus_valmis', 3);
                    }
                    if (filterParameters.tutkimus_julkinen) {
                        listServiceFunctions.setProp('tutkimus_julkinen', filterParameters.tutkimus_julkinen);
                    } else {
                        listServiceFunctions.setProp('tutkimus_julkinen', 3);
                    }
                    if (filterParameters.kenttatyo_alkuvuosi) {
                        listServiceFunctions.setProp('kenttatyo_alkuvuosi', filterParameters.kenttatyo_alkuvuosi);
                    } else {
                        listServiceFunctions.setProp('kenttatyo_alkuvuosi', "");
                    }
                    if (filterParameters.kenttatyo_paatosvuosi) {
                        listServiceFunctions.setProp('kenttatyo_paatosvuosi', filterParameters.kenttatyo_paatosvuosi);
                    } else {
                        listServiceFunctions.setProp('kenttatyo_paatosvuosi', "");
                    }
                    if (filterParameters.kenttatyojohtaja) {
                        listServiceFunctions.setProp('kenttatyojohtaja', filterParameters.kenttatyojohtaja);
                    } else {
                        listServiceFunctions.setProp('kenttatyojohtaja', "");
                    }
                    if (filterParameters.kl_koodi) {
                        listServiceFunctions.setProp('kl_koodi', filterParameters.kl_koodi);
                    } else {
                        listServiceFunctions.setProp('kl_koodi', "");
                    }
                    if (filterParameters.tutkija) {
                        listServiceFunctions.setProp('tutkija', filterParameters.tutkija);
                    } else {
                        listServiceFunctions.setProp('tutkija', "");
                    }
                    if (filterParameters.organisaatio) {
                        listServiceFunctions.setProp('organisaatio', filterParameters.organisaatio);
                    } else {
                        listServiceFunctions.setProp('organisaatio', "");
                    }
                    if (filterParameters.nayte_paanumero) {
                        listServiceFunctions.setProp('nayte_paanumero', filterParameters.nayte_paanumero);
                    } else {
                        listServiceFunctions.setProp('nayte_paanumero', "");
                    }
                }
            }
            return listServiceFunctions;
        }
]);