/**
 * Tutkimusalue controller
 */
angular.module('mip.tutkimus').controller(
        'TutkimusalueController',
        [
                '$scope', 'ModalService', 'AlertService', 'MapService','$timeout', '$rootScope', 'olData',
                'hotkeys', 'ListService', 'locale', 'UserService', 'permissions', 'selectedModalNameId', 'existing', 'tutkimusalue', 'ModalControllerService',
                'TutkimusalueService', 'parentModalId', 'tutkimus', 'NgTableParams', 'Auth', 'YksikkoService', 'LoytoService',
                'EntityBrowserService', 'NayteService', 'KohdeService',
                function($scope, ModalService, AlertService, MapService, $timeout, $rootScope, olData,
                        hotkeys, ListService, locale, UserService, permissions, selectedModalNameId, existing, tutkimusalue, ModalControllerService,
                        TutkimusalueService, parentModalId, tutkimus, NgTableParams, Auth, YksikkoService, LoytoService,
                        EntityBrowserService, NayteService, KohdeService) {

                	var vm = this;

                    /**
                     * Controllerin set-up. Suoritetaan ainoastaan kerran.
                     * Pidetään huoli siitä, että kun näkymä on ladattu, niin kartta on valmiina ja käytettävissä.
                     *
                     */
                    vm.setUp = function() {
                        angular.extend(vm, ModalControllerService);
                        vm.entity = 'tutkimusalue';
                        vm.setModalId();

                        vm.setMapId('tutkimusalue');
                        vm.setMapPopupId();
                        // Valitun modalin nimi ja järjestysnumero
                        vm.modalNameId = selectedModalNameId;

                        vm.center = {
                                lat : null,
                                lon : null,
                                autodiscover : false,
                                bounds: []
                            };

                        vm.invKohteet = [];
                        vm.invKohteetOrig = [];

                        // Tutkimus välitetty
                        if(tutkimus){
                            vm.tutkimus = tutkimus;

                            // Inventointi-tutkimukselle näytetään kohteet.
                            if(vm.tutkimus.properties.tutkimuslaji.id === 5 && vm.tutkimus.properties.inventointiKohteet){
                                vm.invKohteet = vm.tutkimus.properties.inventointiKohteet;
                                vm.invKohteetOrig = angular.copy(vm.invKohteet);
                            }
                        }

                        // Tutkimusalue välitetty
                        if (tutkimusalue) {
                            vm.tutkimusalue = tutkimusalue;
                            // Asetetaan tutkimusalueen sijainti
                            if(vm.tutkimusalue.geometry && vm.tutkimusalue.geometry.type == 'Point') {
                                vm.tutkimusalue.properties["sijainti_piste"] = vm.tutkimusalue.geometry.coordinates[0] + " " + vm.tutkimusalue.geometry.coordinates[1] ;
                            } else if(vm.tutkimusalue.geometry && vm.tutkimusalue.geometry.type == 'Polygon') {
                                vm.tutkimusalue.properties.sijainti = "";
                                // Käydään geometria läpi ja lisätään sijainti-kenttään pilkulla eroteltuina
                                // x1 y1,x2 y2,x3 y3 ...
                                for(var i = 0; i< vm.tutkimusalue.geometry.coordinates[0].length; i++) {
                                    var pair = vm.tutkimusalue.geometry.coordinates[0][i];
                                    vm.tutkimusalue.properties.sijainti += pair[0] + " " + pair[1] + ",";
                                }
                                // Poistetaan viimeinen ,
                                vm.tutkimusalue.properties.sijainti = vm.tutkimusalue.properties.sijainti.slice(0, -1);
                            }

                        } else {
                            // Uusi tutkimusalue, alustetaan default arvot.
                            // tutkimuksesta on mukana vaaditut tiedot, jotta featuren layerin värit saadaan halutuiksi
                            vm.tutkimusalue = {
                                'properties' : {
                                    'ark_tutkimus_id': tutkimus.properties.id,
                                    'yksikot': [],
                                    'tutkimus': { nimi: tutkimus.properties.nimi, ark_tutkimuslaji_id: tutkimus.properties.ark_tutkimuslaji_id }
                                },
                                geometry : null,
                                type: 'Feature'
                            };
                        }

                        // Store the original tutkimusalue for possible
                        // cancel operation
                        vm.original = angular.copy(vm.tutkimusalue);

                        // existing = true when viewing an existing property
                        // false when creating a new one
                        if (!existing) {
                            vm.edit = true;
                            vm.create = true;
                        }

                        // Käyttöoikeudet talteen
                        vm.permissions = permissions;

                        // Jos kyseessä on inventointitutkimus, ei inventoijalla ole oikeutta muokata tutkimusaluetta
                        if(UserService.getProperties().user.ark_rooli === 'katselija' && vm.tutkimusalue.properties.tutkimus && vm.tutkimusalue.properties.tutkimus.ark_tutkimuslaji_id === 5) {
                            vm.permissions['muokkaus'] = false;
                            vm.permissions['poisto'] = false;
                            vm.permissions['luonti'] = false;
                        }

                        // Uuden yksikön lisäys
                        if (permissions.luonti) {
                            vm.showCreateNewButton = true;
                        }

                        // all possible layers; shown in dropdown button
                        vm.objectLayers = [
                            {
                                "value" : "Tutkimusalueet",
                                "label" : locale.getString('ark.Research_areas')
                            },                            {
                                "value" : "Kohteet",
                                "label" : locale.getString('ark.Targets')
                            }
                        ];
                        /*
                         * Array for holding all of the visible layers we have for the map
                         */
                        vm.mapLayers = [];
                        vm.selectedMapLayers = [];

                        // layers selected for showing; note, vm.mapLayers holds
                        // the "real" layers that are
                        // drawn on the map; these are object (feature) layers
                        vm.selectedLayers = [];

                        vm.extent = null;

                        /**
                         * Extendataan kartta (MapService.map() palauttama map) viewmodeliin
                         */
                        angular.extend(vm, MapService.map(vm.mapLayers));

                        // is the point setting tool active or not? Defaults to not
                        vm.pointTool = false;

                        /**
                         * Polygonin piirtoon vaadittavat muuttujat ja interaktiot
                         */
                        // is the drawing tool active or not? Defaults to not
                        vm.drawingTool = false;

                        vm.drawingSource = new ol.source.Vector({
                            useSpatialIndex : false
                        });

                        vm.drawingLayer = new ol.layer.Vector({
                            source: vm.drawingSource
                        });

                        vm.drawInteraction = new ol.interaction.Draw({
                            source : vm.drawingSource,
                            type : 'Polygon'
                        });

                        // default the draw interaction to inactive
                        vm.drawInteraction.setActive(false);

                        // stop drawing after a feature is finished
                        vm.drawingSource.on('addfeature', function (event) {
                            vm.toggleDrawingTool();
                        });

                        vm.drawInteraction.on('drawstart', function (event) {
                            // unused atm
                        }, this);

                        // Polygonin sulkemisen toiminnot
                        vm.drawInteraction.on('drawend', function (event) {
                            // find the correct layer to append the newly drawn
                            // feature to
                            for (var i = 0; i < vm.mapLayers.length; i++) {
                                var mapLayer = vm.mapLayers[i];

                                // it's this one
                                if (mapLayer.name == 'Tutkimusalueet') {
                                    // featureCoordArray will have the
                                    // coordinates in GeoJSON format,
                                    // propsCoords will have them in a "flat"
                                    // string
                                    var featureCoordArray = [], propsCoords = "";

                                    // get the coordinates of the new feature,
                                    // convert and store them
                                    for (var i = 0; i < event.feature.getGeometry().flatCoordinates.length; i += 2) {
                                        var lonlat = MapService.epsg3067ToEpsg4326(event.feature.getGeometry().flatCoordinates[i], event.feature.getGeometry().flatCoordinates[i + 1]);
                                        featureCoordArray.push(lonlat);

                                        if (i > 0) {
                                            propsCoords += ","
                                        }
                                        propsCoords += lonlat[0];
                                        propsCoords += " " + lonlat[1];
                                    }

                                    var geometry = {
                                        type : "Polygon",
                                        coordinates : [
                                            featureCoordArray
                                        ]
                                    };

                                    // create the feature for the map layer
                                    var feature = {
                                        type : "Feature",
                                        geometry : geometry,
                                        properties: vm.tutkimusalue.properties
                                    };

                                    vm.tutkimusalue.geometry = feature.geometry;

                                    /*
                                     * Inventointi-tutkimus.
                                     * Haetaan aluerajauksella löytyvät kohteet.
                                     */
                                    if(vm.tutkimus.properties.tutkimuslaji.id === 5) {
                                        KohdeService.haePolygoninKohteet(propsCoords).then(function(kohde) {

                                            if(kohde.features.length === 0){
                                                AlertService.showInfo(locale.getString('ark.Targets_not_found_with_area'));
                                            }

                                            if(kohde.features.length > 0){
                                                vm.invKohteet = kohde.features;
                                                AlertService.showInfo(locale.getString('ark.Targets_selected_for_inventory', {
                                                    count : kohde.features.length
                                                }));
                                            }
                                            vm.updateLayerData('Kohteet');

                                        }, function error () {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Targets_not_found_with_area'));
                                        });
                                    }

                                    // add the newly drawn feature to the
                                    // correct layer
                                    mapLayer.source.geojson.object.features.push(feature);

                                    // set the coordinates so that they are
                                    // POSTed or PUT
                                    vm.tutkimusalue.properties["sijainti"] = propsCoords;

                                    // clear the coordinates of the point (if any)
                                    // so they are not POSTed or PUT
                                    vm.tutkimusalue.properties["sijainti_piste"] = null;

                                    // clear the drawing source when practical
                                    $timeout(function () {
                                        vm.drawingSource.clear();
                                    });

                                    break;
                                }
                            }
                            $scope.$apply();
                        });

                        /*
                         * Ladataan kartta
                         */
                        olData.getMap(vm.mapId).then(function (map) {
                            vm.map = map;

                            vm.getAvailableMapLayers(true);

                            vm.selectDefaultObjectLayers();

                            //Lisätään piirtotaso
                            vm.map.addLayer(vm.drawingLayer);

                            vm.map.addInteraction(vm.drawInteraction);

                            /**
                             * Keskitetään kartta
                             */
                            vm.centerToExtent([vm.tutkimusalue]);

                        });

                        $scope.focusInput = false;

                    };
                    vm.setUp();

                    /**
                     * Keskitetään kartta. Pitää olla timeoutin sisällä, muuten ei vaikutusta
                     */
                    vm.centerToExtent = function(data) {
                        $timeout(function() {
                            var taExtent = MapService.calculateExtentOfFeatures(data);

                            var oldExtent = angular.copy(vm.extent);
                            vm.extent = MapService.getBiggestExtent(vm.extent, taExtent);

                            if(oldExtent !== vm.extent) {
                                MapService.centerToExtent(vm.map, vm.extent);
                            }
                        });
                    }
                    /**
                     * ModalHeader kutsuu scopesta closea
                     */
                    $scope.close = function() {
                        vm.close();
                        $scope.$destroy();
                    };

                    /**
                     * Cancel edit mode additional steps
                     */
                    vm._cancelEdit = function () {
                    	//Jos ollaan luontimoodissa, ei tutkimusalueita koiteta päivittää
                    	if(!vm.create) {
                            vm.tutkimusalue = angular.copy(vm.original);
                            vm.invKohteet = angular.copy(vm.invKohteetOrig);
                            vm.updateLayerData('Tutkimusalueet');
                            vm.updateLayerData('Kohteet');
                    	}
                        vm.edit = false;
                    };

                    /**
                     * Readonly / edit mode - additional steps
                     */
                    vm._editMode = function () {
                    	$scope.focusInput = true;
                    };

                    /**
                     * Save changes
                     */
                    vm.save = function () {
                        // Inventointitutkimuksen alueille esitetään vahvistus, jotta inventointitietoja ei hukattaisi vahingossa jos tutkimusalueen tietoja päivitetään.
                        var conf = null;
                        if(vm.tutkimusalue.properties.id && vm.tutkimus.properties.tutkimuslaji.id === 5) {
                            conf = confirm("Tutkimusalueen sijainnin muokkaaminen tai kohteiden poistaminen tyhjentää kohteiden inventointitiedot tämän tutkimuksen osalta. Tallennetaanko?");
                        }
                        // Käyttäjä vastaa myöntävästi tai kysymystä ei esitetty ollenkaan.
                        if (conf == true || conf == null) {
                            vm.disableButtonsFunc();

                            // Inventointitutkimukselle tallennetaan valittuna olevat kohteet
                            if(vm.tutkimus.properties.tutkimuslaji.id === 5){
                                var kohdeLista = [];
                                for (var i = 0; i < vm.invKohteet.length; i++) {
                                    var kohde = {'kohde_id': vm.invKohteet[i].properties.id};
                                    kohdeLista.push(kohde);
                                }
                                vm.tutkimusalue['properties']['kohteet'] = kohdeLista;
                            }

                            TutkimusalueService.saveTutkimusalue(vm.tutkimusalue).then(function (id) {
                                if (vm.create) {
                                    vm.tutkimusalue.properties["id"] = id;
                                    vm.create = false;
                                }
                                vm.edit = false;

                                // "update" the original after successful save
                                vm.original = angular.copy(vm.tutkimusalue);
                                vm.invKohteetOrig = angular.copy(vm.invKohteet);

                                // Välitetään tutkimukselle tiedot
                                $rootScope.$broadcast('Tutkimusalue_lisatty', {
                                    'tutkimusalue' : vm.tutkimusalue,
                                    'modalId' : parentModalId,
                                    'tutkimusId' : tutkimus.properties.id,
                                    'invKohteet' : vm.invKohteet
                                });

                                vm.disableButtonsFunc();
                                AlertService.showInfo(locale.getString('common.Save_ok'), "");
                            }, function error () {
                                AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
                                vm.disableButtonsFunc();
                            });
                        }
                    };

                    /*
                     * Tutkimusalueen soft delete. Ei voi poistaa jos löytyy yksiköitä.
                     */
                    vm.deleteTutkimusalue = function(modalNameId) {
                        if(vm.yksikotTable.data.length > 0 ||
                        		vm.loydotTable.data.length > 0 ||
                        		vm.naytteetTable.data.length > 0){
                        	AlertService.showError(locale.getString('area.Delete_failed'), locale.getString('ark.Research_area_delete_error'));
                        }else{
                            var conf = confirm(locale.getString('common.Confirm_delete2', {'item': vm.tutkimusalue.properties.nimi}));
                            if (conf) {
                                TutkimusalueService.deleteTutkimusalue(vm.tutkimusalue).then(function() {
                                    vm.close();
                                    $scope.$destroy();
                                    locale.ready('common').then(function() {
                                        AlertService.showInfo(locale.getString('ark.Research_area'), locale.getString('common.Deleted'));
                                    });
                                    $rootScope.$broadcast('Tutkimusalue_poistettu', {
                                        'tutkimusalue' : vm.tutkimusalue,
                                        'modalId' : parentModalId
                                    });
                                }, function error(data) {
                                    locale.ready('area').then(function() {
                                        AlertService.showError(locale.getString('area.Delete_failed'), AlertService.message(data));
                                    });
                                });
                            }
                        }
                    };

					/*
					 *  Tutkimusalueen nimen oltava uniikki
					 */
					vm.uniikkiNimi = true;
					vm.tarkistaUniikkiNimi = function (form) {
						if(vm.tutkimusalue.properties.nimi){
							var available = TutkimusalueService.tarkistaTutkimusalueenNimi(vm.tutkimusalue.properties.nimi, vm.tutkimusalue.properties.ark_tutkimus_id).then(function success (data) {
								if (data) {
									form.nimi.$setValidity('kaytossa', true);
									vm.uniikkiNimi = true;
								} else {
									form.nimi.$setValidity('kaytossa', false);
									vm.uniikkiNimi = false;
								}
							});
							return available;
						}
					};

                    /**
                     * Yksiköiden taulukko
                     */
                    vm.yksikotTable = new NgTableParams({
                        page : 1,
                        count : 25,
                        total : 25
                    }, {
                    	tutkimusalue_id : [
                    		vm.tutkimusalue.properties.id
                            ],
                        getData : function($defer, params) {
                        	//(vm.tutkimus on asetettu aina), haetaan ainoastaan jos tutkimuksen laji on muuta kuin irtolöytö
                        	if(vm.tutkimusalue.properties && vm.tutkimusalue.properties.id && !vm.irtoTaiTarkastus()) {
	                            Auth.checkPermissions("arkeologia", "ark_tutkimusalue", vm.tutkimusalue.properties.id).then(function(permissions) {

	                                if (permissions.katselu) {
	                                    filterParameters = ListService.parseParameters(params);

	                                    // Lisätään tutkimusalueen id hakuun
	                                    filterParameters['ark_tutkimusalue_id'] = vm.tutkimusalue.properties.id;
	                                    filterParameters['ark_tutkimus_id'] = vm.tutkimusalue.properties.ark_tutkimus_id;

	                                    if(vm.promise !== undefined) {
	                                        vm.cancelRequest();
	                                    }

	                                    vm.yksikotPromise = YksikkoService.haeYksikot(filterParameters);
	                                    vm.yksikotPromise.then(function(data) {

	                                        if (data.count) {
	                                            vm.searchResults = data.count;
	                                        } else {
	                                            vm.searchResults = 0;
	                                        }

	                                        params.total(data.total_count);
	                                        $defer.resolve(data.features);

	                                    }, function(data) {
	                                        locale.ready('common').then(function() {
	                                            AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
	                                        });
	                                        orderedData = [];
	                                        $defer.resolve(orderedData);
	                                    });
	                                } else {
	                                    locale.ready('common').then(function() {
	                                        locale.ready('estate').then(function() {
	                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
	                                        });
	                                    });
	                                }
	                            }, function error(data) {
	                                locale.ready('common').then(function() {
	                                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
	                                });
	                            });
                        	}
                        }
                    });

                    /*
                     * Muodostetaan ja tallentaan uusi yksikkötunnus
                     */
                    vm.yksikonLisays = false;
                    vm.lisaaYksikkotunnus = function() {

                    	// Seuraava vapaa yksikon_numero haetaan per tutkimus
                    	var yksikon_nro = 1;
                    	YksikkoService.luoYksikkoNumero(vm.tutkimus.properties.id).then(function success (data){
                    		if (data) {
                    			if(data.properties != null){
                    				yksikon_nro = data.properties;
                    			}

                                // Uudelle yksikölle laitetaan tutkimusalueen id viittaus
                            	vm.uusiYksikko = {
                            			'properties' : {
                                            'ark_tutkimusalue_id': vm.tutkimusalue.properties.id,
                                            'ark_tutkimus_id' : tutkimus.properties.id,
                            				'yksikkotunnus': null,
                            				'yksikkotyyppi': null,
                                			'yksikon_numero': yksikon_nro,
                                			'yksikkotyypit': [],
                                			'tyovaiheet': []
                            			}
                            	};
                                //Asetetaan focus valintalistaan
                            	$scope.focusInput = true;
                            	AlertService.showInfo(locale.getString('unit.Next_available_unit_number_created'), "");

                    		}
                    	});

                    	vm.yksikonLisays = true;
                    }

					/*
					 * Tunnuksen oltava uniikki tutkimuksen sisällä
					 */
					vm.uniikkiNumero = true;
					vm.tarkistaNumero = function (form) {
						if(vm.uusiYksikko.properties.yksikon_numero){
							var available = YksikkoService.tarkistaYksikonNumero(vm.uusiYksikko.properties.yksikon_numero, vm.tutkimus.properties.id, vm.tutkimusalue.properties.id).then(function success (data) {
								if (data) {
									form.yksikon_numero.$setValidity('kaytossa', true);
									vm.uniikkiNumero = true;
									vm.disableButtons = false;
								} else {
									form.yksikon_numero.$setValidity('kaytossa', false);
									vm.uniikkiNumero = false;
								}
							});
							return available;
						}
					};

                    /*
                     * Tallennetaan yksikkö ja avataan kaivauksen aikaiset muistiinpanot
                     */
                    vm.tallennaYksikkotunnus = function(){

                    	var tunnus = '';

                    	if(vm.uusiYksikko.properties.yksikkotyyppi.nimi_fi == 'Maayksikkö'){
                    		tunnus = 'M';
                    	}else if(vm.uusiYksikko.properties.yksikkotyyppi.nimi_fi == 'Rakenneyksikkö'){
                    		tunnus = 'R';
                    	}else{
                    		tunnus = 'L';
                    	}

                    	// Muodostetaan tunnus (valittu tyyppi-kirjain + annettu numero)
                        vm.uusiYksikko.properties.yksikkotunnus = tunnus + vm.uusiYksikko.properties.yksikon_numero;

                        YksikkoService.luoTallennaYksikko(vm.uusiYksikko).then(function (yksikko) {
                        	vm.yksikonLisays = false;
                        	// Taulukon päivitys
                        	vm.yksikotTable.reload();

                            AlertService.showInfo(locale.getString('common.Save_ok'), "");

                            // Aktivoidaan painikkeet
                            vm.disableButtons = false;

                            // Avataan tallennettu yksikkö kaivaus muistiinpanojen syöttöön
                            ModalService.lisaaYksikkoModal(yksikko, vm.tutkimusalue, vm.permissions);

                        }, function error (data) {
                            AlertService.showError(locale.getString('common.Save_failed'), AlertService.message(data));
							vm.uniikkiNumero = false;
                        });
                    };

                    // Peruuta yksikkö ikkunasta
                    vm.peruutaYksikonLisays = function(form){
                    	vm.uusiYksikko = null;
                    	vm.yksikonLisays = false;
                    	$scope.focusInput = false;
                    	vm.disableButtons = false;
						form.yksikon_numero.$setValidity('kaytossa', true);
						vm.uniikkiNumero = true;
                    };

                    /*
                     * Yksikön valinta listalta. Edit, view ja muistiinpanojen syöttö päätellään yksikkoControllerissa
                     */
                    vm.avaaYksikko = function(valittu_yksikko){
                    	YksikkoService.haeYksikko(valittu_yksikko.properties.id).then(function(yksikko) {

                            // Nuolinapit yksiköille
                            filterParams = [];
                            filterParams['ark_tutkimusalue_id'] = vm.tutkimusalue.properties.id;
                            filterParams['ark_tutkimus_id'] = vm.tutkimusalue.properties.ark_tutkimus_id;

                            // Nuolinapit aktivoidaan vain kaivaus, koekaivaus ja konekaivuun valvonnalle
                            if(vm.tutkimus.properties.tutkimuslaji.id === 7 || vm.tutkimus.properties.tutkimuslaji.id === 10 ||
								vm.tutkimus.properties.tutkimuslaji.id === 12){
                                filterParams['yksikko_id'] = undefined;
						    } else {
                                filterParams['yksikko_id'] = valittu_yksikko.properties.id;
                            }

                            EntityBrowserService.setQuery('yksikko', valittu_yksikko.properties.id, filterParams, vm.yksikotTable.total());

                    		if(yksikko.properties.kaivaus_valmis){
                                // Avataan tallennettu yksikkö katselutilaan
                    			ModalService.yksikkoModal(yksikko, vm.tutkimusalue, vm.permissions);
                    		}else{
                                // Avataan kaivaus muistiinpanojen syöttöön
                    			ModalService.lisaaYksikkoModal(yksikko, vm.tutkimusalue, vm.permissions);
                    		}

    					}, function error (data) {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(data));

                        });
                    };

                    // Lisää löytö taulukosta valitulle yksikölle. Tila on aina 1 = Luetteloitu.
                    vm.lisaaLoyto = function(yksikko){
                        // Uudelle löydölle laitetaan yksikön id viittaus
                    	vm.uusiLoyto = {
                    			'properties' : {
                    				'ark_tutkimusalue_yksikko_id': yksikko.properties.id,
                                    'yksikkotunnus': yksikko.properties.yksikkotunnus,
                                    'ark_tutkimus_id': vm.tutkimusalue.properties.ark_tutkimus_id,
                    				'loydon_tila_id': 1,
                    				'ark_materiaalikoodi_id': null,
                    				'ark_loyto_tyyppi_id': null,
                    				'luettelointinumero': null,
                    				'materiaalikoodi': null
                    			}
                    	};

                    	// Valittu yksikkö talteen
                    	vm.yksikko = yksikko;
                    	vm.loydonLisays = true;
                        //Asetetaan focus valintalistaan
                    	$scope.focusInput = true;
                    	vm.disableButtons = true;
                    };

                    /*
                     * Irtolöydön lisäys painikkeen klikki
                     */
                    vm.lisaaIrtoLoyto = function (){
                		// Irtolöytö
                    	vm.uusiLoyto = {
                    			'properties' : {
                                    'yksikkotunnus': null,
                                    'ark_tutkimus_id': vm.tutkimusalue.properties.ark_tutkimus_id,
                    				'loydon_tila_id': 1,
                    				'ark_loyto_tyyppi_id': null,
                    				'luettelointinumero': null,
                    				'materiaalikoodi': null,
                    				'ark_tutkimusalue_id': vm.tutkimusalue.properties.id //<<-- Kertoo, että on irtolöytö tai tarkastus
                    			}
                    	};
                    	vm.loydonLisays = true;
                        //Asetetaan focus valintalistaan
                    	$scope.focusInput = true;
                    	vm.disableButtons = true;
                    };

                    // Peruuta löytö ikkunasta
                    vm.peruutaLoydonLisays = function(){
                    	vm.uusiLoyto = null;
                    	vm.loydonLisays = false;
                    	$scope.focusInput = false;
                    	vm.disableButtons = false;
                    };

                    /*
                     * Tallennetaan löydön tunnus ja avataan löydön tietojen lisäys
                     */
                    vm.tallennaLoytotunnus = function(){

                    	vm.loydonLisays = false;

                    	/*
                    	 * Mikäli tutkimuksen löytöjen kokoelmatunnus on TKM, luettelointinumero muodostetaan kolmesta kentästä:
                    	 * 1.kokoelmatunnus + näytteiden päänumero (tutkimukselta)
						 * 2.näytekoodi + yksikkötunnus ilman yksikkötyypin kirjainta
						 * 3.juokseva alanumero (per näytekoodi, ilman etunollia)
						 * Paitsi irtolöydöllä, joilla materiaalikoodia ei ole:
						 *   kokoelmatunnus+päänumero : juokseva alanumero (per tutkimus)
						 *
                    	 *
                    	 * Mikäli löytöjen kokoelmatunnus on KM tai TYA, luettelointinumero muodostetaan seuraavasti:
                    	 * kokoelmatunnus + löytöjen päänumero (tutkimukselta)
                    	 * juokseva alanumero (ilman etunollia)
                    	 */
                    	var luettelointinumero;

                    	if(!tutkimus.properties.loyto_paanumero){
                    		AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Discovery_main_number_missing'));

                            // Aktivoidaan painikkeet
                            vm.disableButtons = false;
                    		return;
                    	};

                        if (!tutkimus.properties.loyto_kokoelmalaji){
                            AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Discovery_collection_type_missing'));

                            // Aktivoidaan painikkeet
                            vm.disableButtons = false;
                    		return;
                        }
                        var kokoelmaTunnus = tutkimus.properties.loyto_kokoelmalaji.tunnus;
                        if(!kokoelmaTunnus) {
                            AlertService.showError(locale.getString('common.Error'), 'Kokoelman tunnusta ei ole syötetty');
                        }
                    	//Irtolöytö tai tarkastus (esim. TKM555:1)
                    	if(vm.irtoTaiTarkastus()) {
                    		var ltn_alku = kokoelmaTunnus.concat(tutkimus.properties.loyto_paanumero).concat(':');
                			luettelointinumero = ltn_alku;
                    	} else {
                    		if(tutkimus.properties.loyto_kokoelmalaji && tutkimus.properties.loyto_paanumero){
                        		var loydonKokoelmalaji = tutkimus.properties.loyto_kokoelmalaji;
                        		if(loydonKokoelmalaji.tunnus == 'T'){
                        			var ltn_alku = kokoelmaTunnus.concat(tutkimus.properties.loyto_paanumero).concat(':');
                        			var ltn_loppu = vm.uusiLoyto.properties.materiaalikoodi.koodi.concat(vm.yksikko.properties.yksikon_numero);
                        			luettelointinumero = ltn_alku.concat(ltn_loppu).concat(':');
                        		}
                        		else {
                        			luettelointinumero = kokoelmaTunnus.concat(tutkimus.properties.loyto_paanumero).concat(':');
                        		}
                        	}
                    	}

                    	// Luettelointinumeroon lisätään juokseva alanumero backendissä
                    	vm.uusiLoyto.properties.luettelointinumero = luettelointinumero;

                    	// Luodaan löytö
                        LoytoService.luoTallennaLoyto(vm.uusiLoyto).then(function (loyto) {

                            AlertService.showInfo(locale.getString('common.Save_ok'), locale.getString('ark.New_discovery_created'));

                            EntityBrowserService.setQuery('loyto', loyto.properties.id, {'loyto_id': loyto.properties.id}, 1);

                            // Aktivoidaan painikkeet
                            vm.disableButtons = false;
                            // Avataan löytö tietojen syöttöön
                            ModalService.loytoModal(loyto, true);

                        }, function error () {
                            AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
                            vm.disableButtons = false;
                        });
                    };

                    /*
                     *  Lisää näyte taulukosta valitulle yksikölle. Tila on aina 4 = Luetteloitu.
                     */
                    vm.lisaaNayte = function(yksikko){

                    	var naytteen_tila = {
                    		'id': 4,
                    		'nimi_fi': 'Luetteloitu'
                    	};

                    	if(yksikko === undefined) {
                    		//IRTOLÖYTÖTUTKIMUS tai tarkastus
                    		// Uudelle näytteelle laitetaan yksikön id viittaus ja muut oletusarvot
                        	vm.uusiNayte = {
                        			'properties' : {
                        				'ark_tutkimusalue_yksikko_id': null,
                                        'yksikkotunnus': null,
                                        'ark_tutkimus_id': vm.tutkimusalue.properties.ark_tutkimus_id,
                        				'ark_nayte_tila_id': 4,
                        				'tila': naytteen_tila,
                        				'naytetta_jaljella': true,
                        				'tutkimus': vm.tutkimus.properties,
                        				'yksikko': null,
                        				'ark_naytekoodi_id': null,
                        				'luettelointinumero': null,
                        				'naytekoodi': null,
                        				'ark_tutkimusalue_id': vm.tutkimusalue.properties.id
                        			}
                        	};
                    	} else {
	                        // Uudelle näytteelle laitetaan yksikön id viittaus ja muut oletusarvot
	                    	vm.uusiNayte = {
	                    			'properties' : {
	                    				'ark_tutkimusalue_yksikko_id': yksikko.properties.id,
	                                    'yksikkotunnus': yksikko.properties.yksikkotunnus,
	                                    'ark_tutkimus_id': vm.tutkimusalue.properties.ark_tutkimus_id,
	                    				'ark_nayte_tila_id': 4,
	                    				'tila': naytteen_tila,
	                    				'naytetta_jaljella': true,
	                    				'tutkimus': vm.tutkimus.properties,
	                    				'yksikko': yksikko.properties,
	                    				'ark_naytekoodi_id': null,
	                    				'luettelointinumero': null,
	                    				'naytekoodi': null
	                    			}
	                    	};
                    	}
                        // Avataan näyte tietojen syöttöön
                        ModalService.nayteModal(vm.uusiNayte, true);
                    };

                    // Peruuta näyteen lisäys ikkunasta
                    vm.peruutaNaytteenLisays = function(){
                    	vm.uusiNayte = null;
                    	vm.naytteenLisays = false;
                    	$scope.focusInput = false;
                    	vm.disableButtons = false;
                    };

                    /**
                     * Taulukon kolumnien tekstien haku
                     */
                    vm.getColumnName = function(column, lang_file) {
                        var str;

                        if (lang_file) {
                            str = lang_file + '.' + column;
                        } else {
                            str = 'common.' + column;
                        }

                        return locale.getString(str);
                    }

        			/*
        			 * Päivitetään yksikkö taulukko, muiden näyttöjen broadcastin mukaan
        			 */
                    $scope.$on('Paivita_yksikko_table', function(event, data) {
                    	if(data['ark_tutkimusalue_id'] === vm.tutkimusalue.properties.id ||
                    			data['ark_vanha_tutkimusalue_id'] === vm.tutkimusalue.properties.id) {
                    		vm.yksikotTable.reload();
                    	}
                    });

                    /*
                     * Kaivauksen tilan valintalistan arvot
                     */
                    locale.ready('unit').then(function() {
                        vm.kyllaEi = [
                            {
                                value : '',
                                label : locale.getString('unit.Digging_ready_all')
                            }, {
                                value : 'false',
                                label : locale.getString('unit.Digging_ready')  + ': ' +  locale.getString('common.No')
                            }, {
                                value : 'true',
                                label : locale.getString('unit.Digging_ready')  + ': ' +  locale.getString('common.Yes')
                            }
                            ];
                        vm.yksikotTable.filter().properties = {};
                        vm.yksikotTable.filter().properties['kaivaus_valmis'] = ''; // Oletuksena kaikki
                    });

                    /**
                     * Löytöjen taulukko
                     */
                    vm.loydotTable = new NgTableParams({
                        page : 1,
                        count : 25,
                        total : 25
                    }, {
                    	ark_irtoloytotutkimusalue_id : [
                    		vm.tutkimusalue.properties.id
                            ],
                        getData : function($defer, params) {
                        	//(vm.tutkimus on asetettu aina), haetaan ainoastaan jos tutkimuksen laji on irtolöytö tai tarkastus
                        	if(vm.tutkimusalue.properties && vm.tutkimusalue.properties.id && vm.irtoTaiTarkastus()) {
	                            Auth.checkPermissions("arkeologia", "ark_tutkimusalue", vm.tutkimusalue.properties.id).then(function(permissions) {

	                                if (permissions.katselu) {
	                                    filterParameters = ListService.parseParameters(params);

	                                    // Lisätään tutkimusalueen id hakuun
	                                    filterParameters['ark_irtoloytotutkimusalue_id'] = vm.tutkimusalue.properties.id;
	                                    //filterParameters['ark_tutkimus_id'] = vm.tutkimusalue.properties.ark_tutkimus_id;

	                                    if(vm.promise !== undefined) {
	                                        vm.cancelRequest();
	                                    }

	                                    vm.lPromise = LoytoService.haeLoydot(filterParameters);
	                                    vm.lPromise.then(function(data) {

	                                        if (data.count) {
	                                            vm.loytoja = data.count;
	                                        } else {
	                                            vm.loytoja = 0;
	                                        }

	                                        params.total(data.total_count);
	                                        $defer.resolve(data.features);

	                                    }, function(data) {
	                                        locale.ready('common').then(function() {
	                                            AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
	                                        });
	                                        orderedData = [];
	                                        $defer.resolve(orderedData);
	                                    });
	                                } else {
	                                    locale.ready('common').then(function() {
	                                        locale.ready('estate').then(function() {
	                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
	                                        });
	                                    });
	                                }
	                            }, function error(data) {
	                                locale.ready('common').then(function() {
	                                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
	                                });
	                            });
                        	}
                        }
                    });

        			/*
        			 * Päivitetään löytöjen taulukko, jos tiedot päivittyneet
        			 */
                    $scope.$on('Update_data', function(event, data) {
                        if (data.type == 'loyto') {
                            vm.loydotTable.reload();
                        }
                    });

                    //Haetaan löytö ja avataan se
                    vm.avaaLoyto = function(loyto) {
                    	LoytoService.haeLoyto(loyto.properties.id).then(function s(loyto) {
                    		EntityBrowserService.setQuery('loyto', loyto.properties.id, {'ark_irtoloytotutkimusalue_id': vm.tutkimusalue.properties.id}, vm.loydotTable.total());
                            // Avataan löytö tietojen syöttöön
                            ModalService.loytoModal(loyto, false);
                    	}, function e(data) {
                    		AlertService.showError(locale.getString('common.Error'), data.message);
                    	});
                    };

                    /**
                     * Naytteiden taulukko
                     */
                    vm.naytteetTable = new NgTableParams({
                        page : 1,
                        count : 25,
                        total : 25
                    }, {
                    	ark_irtoloytotutkimusalue_id : [
                    		vm.tutkimusalue.properties.id
                            ],
                        getData : function($defer, params) {

                        	if(vm.tutkimusalue.properties && vm.tutkimusalue.properties.id && vm.irtoTaiTarkastus()) {
	                            Auth.checkPermissions("arkeologia", "ark_tutkimusalue", vm.tutkimusalue.properties.id).then(function(permissions) {

	                                if (permissions.katselu) {
	                                    filterParameters = ListService.parseParameters(params);

	                                    // Lisätään tutkimusalueen id hakuun
	                                    filterParameters['ark_irtoloytotutkimusalue_id'] = vm.tutkimusalue.properties.id;
	                                    //filterParameters['ark_tutkimus_id'] = vm.tutkimusalue.properties.ark_tutkimus_id;

	                                    if(vm.promise !== undefined) {
	                                        vm.cancelRequest();
	                                    }

	                                    vm.nPromise = NayteService.haeNaytteet(filterParameters);
	                                    vm.nPromise.then(function(data) {

	                                        if (data.count) {
	                                            vm.naytteita = data.count;
	                                        } else {
	                                            vm.naytteita = 0;
	                                        }

	                                        params.total(data.total_count);
	                                        $defer.resolve(data.features);

	                                    }, function(data) {
	                                        locale.ready('common').then(function() {
	                                            AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
	                                        });
	                                        orderedData = [];
	                                        $defer.resolve(orderedData);
	                                    });
	                                } else {
	                                    locale.ready('common').then(function() {
	                                        locale.ready('estate').then(function() {
	                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
	                                        });
	                                    });
	                                }
	                            }, function error(data) {
	                                locale.ready('common').then(function() {
	                                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
	                                });
	                            });
                        	}
                        }
                    });

        			/*
        			 * Päivitetään näytteiden taulukko, jos tiedot päivittyneet
        			 */
                    $scope.$on('Update_data', function(event, data) {
                        if (data.type == 'nayte') {
                            vm.naytteetTable.reload();
                        }
                    });

                    //Haetaan nayte ja avataan se
                    vm.avaaNayte = function(nayte) {
                    	NayteService.haeNayte(nayte.properties.id).then(function s(nayte) {
                    		EntityBrowserService.setQuery('nayte', nayte.properties.id, {'ark_irtoloytotutkimusalue_id': vm.tutkimusalue.properties.id}, vm.naytteetTable.total());
                            // Avataan löytö tietojen syöttöön
                            ModalService.nayteModal(nayte, false);
                    	}, function e(data) {
                    		AlertService.showError(locale.getString('common.Error'), data.message);
                    	});
                    };

                    /*
                     * Irtolöytö ja tarkastustutkimukselle lisätään löydöt suoraan alueelle.
                     */
                    vm.irtoTaiTarkastus = function(){
                    	if(vm.tutkimus.properties.tutkimuslaji.id == 6 || vm.tutkimus.properties.tutkimuslaji.id == 11){
                    		return true;
                    	}else if(tutkimus.properties.tutkimuslaji.id == 6 || tutkimus.properties.tutkimuslaji.id == 11){
                    		return true;
                    	}else{
                    		return false;
                    	}
                    };

                    // Onko inventointi-tutkimus
                    vm.inventointiTutkimus = function(){
                    	if(vm.tutkimus.properties.tutkimuslaji.id === 5){
                    		return true;
                    	}else{
                    		return false;
                    	}
                    };

                    /**
                     * Avaa linkistä valitun kohteen omaan ikkunaan
                     */
                    vm.avaaKohde = function (kohde) {
                        if (kohde) {
                            KohdeService.fetchKohde(kohde.properties.id).then(function (haettu_kohde) {
                                EntityBrowserService.setQuery('kohde', haettu_kohde.properties.id, { 'kohde_id': haettu_kohde.properties.id }, 1);
                                ModalService.kohdeModal(haettu_kohde);
                            });
                        }
                    };

                    /*
                     * Tarkastustutkimuksella on muistiinpanot kenttä, joka näytetään vain tutkijalle ja pääkäyttäjälle.
                     */
                    vm.tarkastusTutkija = function(){
                    	if(vm.tutkimus.properties.tutkimuslaji.id == 11){
                    		var kayttaja = UserService.getProperties();
                        	if(kayttaja.user.rooli === "pääkäyttäjä" || kayttaja.user.rooli === "tutkija"){
                        		return true;
                        	}else{
                        		return false;
                        	}

                    	}else{
                    		return false;
                    	}
                    };

                    /*
                     * Avaa kuva
                     */
                    vm.openImage = function(image, kuvat) {
                        ModalService.arkImageModal(image, 'tutkimusalue', vm.tutkimusalue, vm.permissions, kuvat, vm.tutkimus.properties.id);
                    };

                    /*
                     * Lisää luetteloitu kuva. Toistaiseksi vain jos kyseessä on tarkastustutkimus.
                     */
                    vm.addImage = function(luetteloi) {
                   		ModalService.arkImageUploadModal('tutkimusalue', vm.tutkimusalue, luetteloi, vm.tutkimus.properties.id);
                    };

                    vm.updateLocationFromFile = function() {
                    	ModalService.lisaaTutkimusalueTiedosto(vm.tutkimus, vm.modalId, vm.tutkimusalue);
                    }

                    //Tutkimusalueen sijainti on muokattu/lisätty.
					$scope.$on('Tutkimusalue_lisatty', function (event, data) {
                        if(data.tutkimusalue != undefined){
                            if(data.tutkimusalue.geometry != null && data.tutkimusalue.geometry.coordinates) {
                                vm.tutkimusalue.geometry = data.tutkimusalue.geometry;

                                // Asetetaan tutkimusalueen sijainti
                                if(vm.tutkimusalue.geometry && vm.tutkimusalue.geometry.type == 'Point') {
                                    vm.tutkimusalue.properties["sijainti_piste"] = vm.tutkimusalue.geometry.coordinates[0] + " " + vm.tutkimusalue.geometry.coordinates[1] ;
                                } else if(vm.tutkimusalue.geometry && vm.tutkimusalue.geometry.type == 'Polygon') {
                                    vm.tutkimusalue.properties.sijainti = "";
                                    // Käydään geometria läpi ja lisätään sijainti-kenttään pilkulla eroteltuina
                                    // x1 y1,x2 y2,x3 y3 ...
                                    for(var i = 0; i< vm.tutkimusalue.geometry.coordinates[0].length; i++) {
                                        var pair = vm.tutkimusalue.geometry.coordinates[0][i];
                                        vm.tutkimusalue.properties.sijainti += pair[0] + " " + pair[1] + ",";
                                    }
                                    // Poistetaan viimeinen ,
                                    vm.tutkimusalue.properties.sijainti = vm.tutkimusalue.properties.sijainti.slice(0, -1);
                                }
                            }
                            vm.updateLayerData('Tutkimusalueet');
                            vm.updateLayerData('Kohteet');
/*
                            * Inventointi-tutkimus.
                            * Haetaan aluerajauksella löytyvät kohteet.
                            */
                            if(vm.tutkimus.properties.tutkimuslaji.id === 5) {
                                var featureCoordArray = [], propsCoords = "";

                                // get the coordinates of the new feature,
                                // convert and store them
                                for (var i = 0; i < vm.tutkimusalue.geometry.coordinates[0].length; i++) {
                                    var lonlat = [vm.tutkimusalue.geometry.coordinates[0][i][0], vm.tutkimusalue.geometry.coordinates[0][i][1]];
                                    featureCoordArray.push(lonlat);

                                    if (i > 0) {
                                        propsCoords += ","
                                    }
                                    propsCoords += lonlat[0];
                                    propsCoords += " " + lonlat[1];
                                }
                                KohdeService.haePolygoninKohteet(propsCoords).then(function(kohde) {

                                    if(kohde.features.length === 0){
                                        AlertService.showInfo(locale.getString('ark.Targets_not_found_with_area'));
                                    }

                                    if(kohde.features.length > 0){
                                        vm.invKohteet = kohde.features;
                                        AlertService.showInfo(locale.getString('ark.Targets_selected_for_inventory', {
                                            count : kohde.features.length
                                        }));
                                    }
                                    vm.updateLayerData('Kohteet');

                                }, function error () {
                                    AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Targets_not_found_with_area'));
                                });
                            }
                        }
                    });

                    /*
                     * OPENLAYERS MAP
                     */
                     /*
                     * -------------------------MAP SWITCHING------------------------------------
                     */

                    /**
                     * Controller-spesifinen funktio, jossa asetetaan oletuksena näkyvät objektitasot.
                     *
                     */
                    vm.selectDefaultObjectLayers = function() {
                        // Add default layers
                        this.selectedLayers.push('Tutkimusalueet');
                        this.selectedLayers.push('Kohteet');
                        this.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

                        /*
                         * Tutkimusalue taso
                         */
                        var taLayer = null;
                        for (var i = 0; i < vm.mapLayers.length; i++) {
                            if (vm.mapLayers[i].name == 'Tutkimusalueet') {
                                taLayer = vm.mapLayers[i];
                                if (taLayer != null) {
                                    vm.updateLayerData('Tutkimusalueet');
                                }
                                break;
                            }
                        }

                        var kohdeLayer = null;
                        for (var i = 0; i < vm.mapLayers.length; i++) {
                            if (vm.mapLayers[i].name == 'Kohteet') {
                                kohdeLayer = vm.mapLayers[i];
                                if (kohdeLayer != null) {
                                    vm.updateLayerData('Kohteet');
                                }
                                break;
                            }
                        }
                    }

                    /*
                     * Select alue or arvoalue layers (or both)
                     */
                    vm.selectLayer = function() {
                        vm.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

                        for (var i = 0; i < vm.mapLayers.length; i++) {
                            if (vm.mapLayers[i].name == 'Tutkimusalueet') {
                                vm.updateLayerData('Tutkimusalueet');
                            }
                            if(vm.mapLayers[i].name == 'Kohteet') {
                                vm.updateLayerData('Kohteet');
                            }
                        }
                    };

                    /**
                     * Controller-spesifinen funktio, jossa määritetään mitä dataa millekin controllerin käsittelemälle tasolle
                     * asetetaan kun taso valitaan.
                     */
                    vm.updateLayerData = function(layerName) {
                        var kohteetWithGeom = [];

                        var feature = vm.tutkimusalue;
                        if(feature.geometry == null || feature.geometry.coordinates == null) {
                            return;
                        }

                        if (vm.invKohteet.length > 0) {
                            for (var j = 0; j < vm.invKohteet.length; j++) {
                                var invKohde = vm.invKohteet[j];
                                if (invKohde.properties.sijainnit) {
                                    for (var i = 0; i < invKohde.properties.sijainnit.length; i++) {
                                        if (invKohde.properties.sijainnit[i].geometry) {
                                            kohteetWithGeom.push(invKohde.properties.sijainnit[i]);
                                        }
                                    }
                                }
                            }
                        }

                        var l = null;
                         for(var i = 0; i<vm.mapLayers.length; i++) {
                             if(vm.mapLayers[i].name == layerName) {
                                 l = vm.mapLayers[i];
                                 break;
                             }
                         }
                         //If we found a valid layer and it's active (=is visible), get the features for the view.
                         if(l && l.active) {
                             if(l.name == 'Tutkimusalueet') {
                                 l.source.geojson.object.features = [vm.tutkimusalue];
                             }
                             if(l.name == 'Kohteet') {
                                l.source.geojson.object.features = kohteetWithGeom;
                            }
                         }
                    };

                    // Move handler of the map. Make the pointer appropriate.
                    // Show popup on mouseover. (TODO: how to make it work in
                    // fullscreen mode?)
                    $scope.$on('openlayers.map.pointermove', function (event, data) {
                        $scope.$apply(function () {
                            if (vm.map) {
                                var map = vm.map;

                                if (!vm.edit) {
                                    var pixel = map.getEventPixel(data.event.originalEvent);

                                    var layerHit = null;
                                    var featureHit = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                                        layerHit = layer;
                                        map.getTarget().style.cursor = 'pointer';
                                        return feature;
                                    });

                                    if (typeof featureHit === 'undefined') {
                                        MapService.hideMapPopup(vm.mapPopupId);
                                        map.getTarget().style.cursor = 'move';
                                        return;
                                    } else {
                                        MapService.showMapPopup(vm.mapPopupId, data, featureHit, layerHit, true);
                                    }
                                } else {
                                    MapService.hideMapPopup(vm.mapPopupId);

                                    if (vm.pointTool || vm.drawingTool) {
                                        map.getTarget().style.cursor = 'pointer';
                                    } else {
                                        map.getTarget().style.cursor = 'move';
                                    }
                                }
                            }
                        });
                    });

                    // Map click handler
                    $scope.$on('openlayers.map.singleclick', function(event, data) {
                        // ...but only in edit mode.
                        if (vm.edit) {
                            if (vm.pointTool) {
                                // perform a transform to get understandable
                                // coordinates
                                var prj = ol.proj.transform([
                                        data.coord[0], data.coord[1]
                                ], data.projection, 'EPSG:4326').map(function(c) {
                                    return c.toFixed(8);
                                });

                                var lat = parseFloat(prj[1]);
                                var lon = parseFloat(prj[0]);

                                for (var i = 0; i < vm.mapLayers.length; i++) {
                                    var mapLayer = vm.mapLayers[i];
                                    if (mapLayer.name == 'Tutkimusalueet') {
                                        mapLayer.source.geojson.object.features.length = 0;

                                        var feat = {
                                            type : "Feature",
                                            geometry : {
                                                type : "Point",
                                                coordinates : [
                                                        lon, lat
                                                ]
                                            },
                                            properties: vm.tutkimusalue.properties
                                        };

                                        mapLayer.source.geojson.object.features.push(feat);
                                        vm.tutkimusalue.geometry = feat.geometry;
                                        break;
                                    }
                                }

                                if (!vm.tutkimusalue.properties) {
                                    vm.tutkimusalue.properties = {
                                        sijainti : null
                                    };
                                }

                                // update piste properties as well, as
                                // those are what we POST or PUT
                                vm.tutkimusalue.properties["sijainti_piste"] = lon + " " + lat;

                                // clear the area (if any) so it is
                                // not POSTed or PUT
                                vm.tutkimusalue.properties["sijainti"] = null;

                                // disengage point setting!
                                vm.togglePointTool();

                                // used to force the map to redraw
                                $scope.$apply();
                            }
                        } else if (!vm.edit) {
                            // Kohteen avaus kartasta
                            var pixel = vm.map.getEventPixel(data.event.originalEvent);

                            var layerHit = null;
                            var featureHit = vm.map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                                layerHit = layer;
                                return feature;
                            });
                            if (typeof featureHit !== 'undefined') {
                                if (layerHit.getProperties().name == 'Kohteet') {
                                    KohdeService.fetchKohde(featureHit.getProperties().id).then(function (kohde) {
                                        if (kohde.properties.kyppi_status == '1') {
                                            AlertService.showInfo(locale.getString('ark.Relic_register_added'));
                                        } else if (kohde.properties.kyppi_status == '2') {
                                            AlertService.showInfo(locale.getString('ark.Relic_register_modified'));
                                        }
                                        EntityBrowserService.setQuery('kohde', kohde.properties.id, { 'kohde_id': kohde.properties.id }, 1);
                                        ModalService.kohdeModal(kohde);
                                    });
                                }
                            }
                        }
                    });

                    vm.togglePointTool = function () {
                        vm.pointTool = !vm.pointTool;
                    };

                    vm.toggleDrawingTool = function (tuhoutunut) {
                        vm.pointTool = false;
                        vm.deleteTool = false;
                        vm.drawingTool = !vm.drawingTool;
                        vm.drawInteraction.setActive(vm.drawingTool);
                    };

                    vm.custom_style = {
                        image: {
                            icon: {
                                anchor: [0.5, 1],
                                anchorXUnits: 'fraction',
                                anchorYUnits: 'fraction',
                                opacity: 0.90,
                                src: 'resources/images/marker.png'
                            }
                        }
                    };

                    //Remove existing marker(s)
                    vm.clearMarker = function () {
                        vm.markers.length = 0;
                    };

                    //Coordinates (lon, lat) and object containing the label information
                    vm.showMarker = function (lon, lat) {
                        //Clear old marker(s)
                        vm.clearMarker();

                        //Convert the coordinates to 4326 projection
                        var epsg4326Coords = MapService.epsg3067ToEpsg4326(lon, lat);

                        // Add marker to the position
                        vm.markers.push({
                            lon: epsg4326Coords[0],
                            lat: epsg4326Coords[1]
                        });

                        // Markerin näyttäminen timeoutin sisällä, koska muutoin marker jää välillä muiden karttatasojen alle.
                        $timeout(function() {
                            var layers = vm.map.getLayers();
                            for (var i = 0; i < layers.array_.length; i++) {
                                var mapLayer = layers.array_[i];

                                // Marker tasolla ei ole nimeä ja sen markers-arvo on true.
                                if (mapLayer.values_.name == undefined && mapLayer.values_.markers === true) {
                                    mapLayer.setZIndex(1000);
                                    break;
                                }
                            }
                            $scope.$apply();
                        }, 1000);
                    };

                    // Poista kaikki sijainnit ja inventoinnin kohteet
                    vm.poistaSijainti = function() {
                        for (var i = 0; i < vm.mapLayers.length; i++) {
                            var mapLayer = vm.mapLayers[i];
                            if (mapLayer.name == 'Tutkimusalueet') {
                                mapLayer.source.geojson.object.features.length = 0;
                            }
                            if (mapLayer.name == 'Kohteet') {
                                mapLayer.source.geojson.object.features.length = 0;
                            }
                        }
                        vm.tutkimusalue.geometry = null;
                        vm.tutkimusalue.properties.sijainti = null;
                        vm.tutkimusalue.properties.sijainti_piste = null;
                        vm.invKohteet = [];
                        vm.pointTool = false;
                        vm.drawingTool = false;
                    };

                    // Poista kohde inventointi-tutkimuksen listalta
                    vm.poistaKohdeInventoinnista = function(kohde) {
                        for (var i = 0; i < vm.invKohteet.length; i++) {
                            if(vm.invKohteet[i].properties.id == kohde.properties.id){
                                vm.invKohteet.splice(i,1);
                                break;
                            }
                        }
                    };

                    hotkeys.bindTo($scope).add({
                        combo : 'o',
                        description : 'vm',
                        callback : function () {
                            console.log(angular.copy(vm));
                        }
                    });

                    hotkeys.bindTo($scope).add({
                        combo : 'i',
                        description : 'map',
                        callback : function () {
                            var vmMap = angular.copy(vm.map);
                            olData.getMap(vm.mapId).then(function(map) {
                                console.log(".1:" + vmMap.getView().getCenter());
                                console.log(".2:" + map.getView().getCenter());
                            });

                        }
                    });

                    // Jos kohde joka inventoitiin kuuluu tähän tutkimusalueeseen ja inventoitu tutkimus oli tämä tutkimus, päivitetään tieto näkyviin
                    $scope.$on('Kohde_inventointi', function(event, data) {
                        //console.log("Tutkimusalue: Inventoidun kohteen tiedot päivitetty");
                        if(vm.tutkimusalue.properties.ark_tutkimus_id == data.tutkimusId) {
                            AlertService.showInfo("Tutkimukseen kuuluvan kohteen inventointitiedot päivittyivät, avaa näkymä uudelleen nähdäksesi muutokset.");
                        }
                    });

                    vm.showMap = true;
                }

        ]);
