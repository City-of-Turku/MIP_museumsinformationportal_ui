/**
 * Alakohteen controller. Kuuluu mip.kohde moduliin. Tallennus ja näyttäminen kohde-controllerin kautta, ei itsenäisesti.
 */
angular.module('mip.kohde').controller(
        'AlakohdeController',
        [
                '$scope', 'CONFIG', 'ModalService', 'AlertService', 'MapService','$timeout', '$rootScope', 'olData',
                'hotkeys', 'ListService', 'locale', 'MuutoshistoriaService', '$filter',
                'SessionService', 'selectedModalNameId', 'existing', 'alakohde', 'ModalControllerService',
                '$q', 'parentModalId', "kohde",
                function($scope,  CONFIG, ModalService, AlertService, MapService, $timeout, $rootScope, olData,
                        hotkeys, ListService, locale, MuutoshistoriaService, $filter,
                        SessionService, selectedModalNameId, existing, alakohde, ModalControllerService,
                        $q, parentModalId, kohde) {
                    var vm = this;

                    /**
                     * Controllerin set-up. Suoritetaan ainoastaan kerran.
                     * Pidetään huoli siitä, että kun näkymä on ladattu, niin kartta on valmiina ja käytettävissä.
                     *
                     */
                    vm.setUp = function() {
                        angular.extend(vm, ModalControllerService);
                        vm.entity = 'alakohde';
                        vm.setModalId();

                        vm.setMapId('alakohde');
                        vm.setMapPopupId('alakohde');
                        // Valitun modalin nimi ja järjestysnumero
                        vm.modalNameId = selectedModalNameId;
                        vm.kohde = kohde;


                        vm.center = {
                                lat : null,
                                lon : null,
                                autodiscover : false,
                                bounds: []
                            };


                        // Get the entity that was selected (if any;
                        // will be empty if creating a new one)
                        if (alakohde) {
                            vm.alakohde = alakohde;
                            vm.alakohde.tyypit = [];
                            if(vm.alakohde.tyyppi) {
                                vm.alakohde.tyypit.push({
                                            'tmp': 'säilötään näin jotta direktiiviä voidaan käyttää suoraan',
                                            'tyyppi': vm.alakohde.tyyppi
                                            });
                                delete vm.alakohde.tyyppi;
                            }
                            if(vm.alakohde.tyyppitarkenne) {
                                vm.alakohde.tyypit[0].tarkenne = vm.alakohde.tyyppitarkenne;
                                delete vm.alakohde.tyyppitarkenne;
                            }

                            //Täytetään _P ja _I
                            if(vm.alakohde.sijainnit && vm.alakohde.sijainnit[0] && vm.alakohde.sijainnit[0].geometry.type === 'Point') {
                                var convertedCoords = MapService.epsg4326ToEpsg3067(vm.alakohde.sijainnit[0].geometry.coordinates[0], vm.alakohde.sijainnit[0].geometry.coordinates[1]);

                                vm._P = convertedCoords[1];
                                vm._I = convertedCoords[0];
                            }

                            if(vm.alakohde.sijainnit === null || vm.alakohde.sijainnit === undefined) {
                                vm.alakohde.sijainnit = [];
                            }

                        } else {
                            vm.alakohde = {
                                    'nimi': '',
                                    'sijainnit': [],
                                    'ajoitukset': [],
                                    'tyypit': [], //Ainoastaan yksi tyyppi mahdollinen, mutta direktiivin toteutuksen takia array
                                geometry : null,
                                type: 'Feature',
                                ark_kohdelaji_id: vm.kohde.properties.laji.id
                            }
                        }

                        // Store the original alakohde for possible
                        // cancel operation
                        vm.original = angular.copy(vm.alakohde);

                        // existing = true when viewing an existing property
                        // false when creating a new one
                        if (existing) {
                            vm.edit = true;
                        } else {
                            vm.create = true;
                            vm.edit = true;
                        }


                        // all possible layers; shown in dropdown button
                        vm.objectLayers = [
                            {
                                "value" : "Alakohteet",
                                "label" : "Alakohteet"
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

                        var extent = null;

                        /**
                         * Extendataan kartta (MapService.map() palauttama map) viewmodeliin
                         */
                        angular.extend(vm, MapService.map(vm.mapLayers));

                        vm.getDetailsTool = false;
                        vm.getDetailsDestination = null;

                        // is the point setting tool active or not? Defaults to not
                        vm.pointTool = false;

                        vm.deleteTool = false;

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

                        vm.drawInteraction.on('drawend', function (event) {
                            // find the correct layer to append the newly drawn
                            // feature to
                            for (var i = 0; i < vm.mapLayers.length; i++) {
                                var mapLayer = vm.mapLayers[i];

                                // it's this one
                                if (mapLayer.name == 'Alakohteet') {
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
                                        properties:{
                                            ark_kohdelaji_id: vm.kohde.properties.laji.id
                                        }
                                    };

                                    if (CONFIG.DEBUG) {
                                        console.log("feature coordinates:");
                                        console.log(featureCoordArray);
                                    }

                                    // add the newly drawn feature to the
                                    // correct layer
                                    //mapLayer.source.geojson.object.features.push(feature);

                                    // set the coordinates so that they are
                                    // POSTed or PUT
                                    vm.alakohde.sijainnit.push(feature);
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
                             * Keskitetään kartta. Pitää olla timeoutin sisällä, muuten ei vaikutusta
                             */
                            $timeout(function() {
                                var alakohdeExtent = MapService.calculateExtentOfFeatures(vm.alakohde.sijainnit);

                                var oldExtent = angular.copy(extent);
                                extent = MapService.getBiggestExtent(extent, alakohdeExtent);

                                if(oldExtent !== extent) {
                                    MapService.centerToExtent(vm.map, extent);
                                }
                            });
                        });

                    };
                    vm.setUp();

                    /*
                     * Jos alakohteella ei ole yhtään sijaintia, asetetaan ensimmäisen sijainnin koordinaatit näkyviin N ja E kenttiin.
                     * Jos alakohteella ei ole yhtään sijaintia ja käyttäjä syöttää kenttiin arvot, asetetaan piste kartalle.
                     * Koordinaatteja ei itsessään tallenneta mihinkään, vaan jos alakohteella ei ole yhtään sijaintia asetettuna ja
                     * käyttäjä syöttää koordinaatit käsin, asetetaan tällöin piste.
                     */
                    vm.setLocation = function(tyyppi) {
                        if((!vm._P || !vm._I) || vm.alakohde.sijainnit.length > 1) {
                            return;
                        }


                        //JOS annettu koordinaatti on koordinaattiextension sisällä, jatketaan
                        //Muutoin returnataan.
                        // Rajat: 19.0900, 59.3000, 31.5900, 70.1300 (http://spatialreference.org/ref/epsg/etrs89-etrs-tm35fin/)
                        //TODO: MapServiceen oma funkkari joka tarkastaa koordinaattien olevan oikealla alueella.

                        //Asetetaan feature oikeaan kohtaan
                        var coords = [vm._P, vm._I];
                        var convertedCoords = MapService.epsg3067ToEpsg4326(vm._I, vm._P);

                        if(convertedCoords[0] > 19.0900 && convertedCoords[0] < 59.3000 && convertedCoords[1] > 31.5900 && convertedCoords[1] < 70.1300) {

                            //Poistetaan ensimmäinen sijainti
                            vm.alakohde.sijainnit.splice(0,1);

                            var feature  = {
                                    'type' : 'Feature',
                                    'geometry': {
                                        'type': 'Point',
                                        'coordinates': convertedCoords,
                                        'id': -1
                                    },
                                    'properties': {'nimi': vm.alakohde.nimi},
                                    'id': -1
                            };
                            vm.alakohde.sijainnit.push(feature);
                            vm.updateLayerData('Kohteet');
                            vm.centerToExtent(vm.alakohde.sijainnit);

                            /*
                             * Haetaan maanmittauslaitokselta annetuilla koordinaateilla kiinteistön osoitetiedot
                             */
                            MapService.fetchBuildingDetails(null, vm._I + " " + vm._P).then(function success(data) {
                                // Osoitteiden parsinta näytölle
                                if (data.data.features) {
                               		vm.muodostaOsoite(data.data.features);
                               		AlertService.showInfo(locale.getString('ark.Estate_search_successful'));
                                } else {
                                    AlertService.showInfo("", AlertService.message(data));
                                }
                            }, function error(err) {
                                locale.ready('error').then(function() {
                                    AlertService.showError(locale.getString('common.Error'), AlertService.message(err));
                                });
                            });
                        }
                    }

                    /**
                     * ModalHeader kutsuu scopesta closea
                     */
                    $scope.close = function() {
                        vm.alakohde = vm.original;
                        vm.close();
                        $scope.$destroy();
                    };

                    /**
                     * Save changes
                     */
                    vm.save = function () {
                    	AlertService.showInfo(locale.getString('ark.Subtarget_changed'));
                        //Korjataan tyyppi takaisin alkuperäiseen formaattiin
                        if(vm.alakohde.tyypit.length > 0) {
                            vm.alakohde.tyyppi = vm.alakohde.tyypit[0].tyyppi;
                        }
                        if(vm.alakohde.tyypit.length > 0 && vm.alakohde.tyypit[0].tarkenne) {
                            vm.alakohde.tyyppitarkenne = vm.alakohde.tyypit[0].tarkenne;
                        }
                        delete vm.alakohde.tyypit;
                        if(vm.create) {
                            /*
                             * Broadcast alakohde kohteelle
                             */
                            $rootScope.$broadcast('Alakohde_lisatty', {
                                'alakohde' : vm.alakohde,
                                'modalId' : parentModalId
                            });
                        }
                        // Sulkee modaalin ja poistaa listalta
                        ModalService.closeModal(vm.modalNameId);
                        $scope.$destroy();
                    };

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
                        // Add default layer (kohteet)
                        this.selectedLayers.push('Alakohteet');
                        this.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

                        /*
                         * Add features, first select the layer and then set the layer source to the alue.
                         */
                        var alakohdeLayer = null;
                        for (var i = 0; i < vm.mapLayers.length; i++) {
                            if (vm.mapLayers[i].name == 'Alakohteet') {
                                alakohdeLayer = vm.mapLayers[i];
                                if (alakohdeLayer != null) {
                                    alakohdeLayer.source.geojson.object.features.length = 0;

                                    alakohdeLayer.source.geojson.object.features = vm.alakohde.sijainnit;
                                }
                                break;
                            }
                        }
                    };

                    /**
                     * Keskitetään kartta. Pitää olla timeoutin sisällä, muuten ei vaikutusta
                     */
                    vm.centerToExtent = function(data) {
                        $timeout(function() {
                            var kohdeExtent = MapService.calculateExtentOfFeatures(data);

                            var oldExtent = angular.copy(vm.extent);
                            vm.extent = MapService.getBiggestExtent(vm.extent, kohdeExtent);

                            if(oldExtent !== vm.extent) {
                                MapService.centerToExtent(vm.map, vm.extent);
                            }
                        });
                    }

                    /**
                     * Controller-spesifinen funktio, jossa määritetään mitä dataa millekin controllerin käsittelemälle tasolle
                     * asetetaan kun taso valitaan.
                     */
                    vm.updateLayerData = function(layerName) {
                        var l = null;
                         for(var i = 0; i<vm.mapLayers.length; i++) {
                             if(vm.mapLayers[i].name == layerName) {
                                 l = vm.mapLayers[i];
                                 break;
                             }
                         }
                         //If we found a valid layer and it's active (=is visible), get the features for the view.
                         if(l && l.active) {
                             if(l.name == 'Alakohteet') {
                                 l.source.geojson.object.features = vm.alakohde.sijainnit;
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

                                if (!vm.edit || vm.deleteTool) {
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

                                    if (vm.drawingTool || vm.pointTool || vm.getDetailsTool) {
                                        map.getTarget().style.cursor = 'pointer';
                                    } else {
                                        map.getTarget().style.cursor = 'move';
                                    }
                                }
                            }
                        });
                    });

                    // Click handler of the map. "Move" the feature by wiping it
                    // and creating a new one.
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
                                    if (mapLayer.name == 'Alakohteet') {
                                        var feature  = {
                                                'type' : 'Feature',
                                                'geometry': {
                                                    'type': 'Point',
                                                    'coordinates': [lon, lat],
                                                    'id': vm.alakohde.sijainnit.length*-1
                                                },
                                                'properties':{
                                                    'ark_kohdelaji_id': vm.kohde.properties.laji.id
                                                }
                                        };

                                        vm.alakohde.sijainnit.push(feature);

                                        break;
                                    }
                                }

                                // disengage point setting!
                                vm.togglePointTool();

                                // used to force the map to redraw
                                $scope.$apply();
                            } else if(vm.deleteTool) {

                                    var pixel = vm.map.getEventPixel(data.event.originalEvent);
                                    var layerHit = null;
                                    var featureHit = vm.map.forEachFeatureAtPixel(pixel, function(feature, layer) {
                                        layerHit = layer;
                                        return feature;
                                    });
                                    if (typeof featureHit !== 'undefined') {
                                        if (layerHit.getProperties().name == 'Alakohteet') {
                                            var fid = featureHit.getId();

                                            for(var i = 0; i<vm.alakohde.sijainnit.length; i++) {
                                                var sijainti = vm.alakohde.sijainnit[i];
                                                if(sijainti.id == fid) {
                                                    //Poistetaan sijainti vm.alakohde.properties.sijainnit-listasta
                                                    //JA tasolta.
                                                    vm.alakohde.sijainnit.splice(i, 1);
                                                    //layerHit.getSource().removeFeature(featureHit); //Ei tarvita, koska sourcen featuret ovat sama kuin sijainnit.
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    vm.toggleDeleteTool();
                                    // used to force the map to redraw
                                    $scope.$apply();
                            }

                            else if(vm.getDetailsTool) {
                                vm.getDetails(data.coord);
                                vm.toggleGetDetailsTool();
                            }
                        }
                    });

                    vm.toggleGetDetailsTool = function(destination) {
                        if(vm.getDetailsTool === false){
                            vm.getDetailsTool = true;
                            vm.getDetailsDestination = destination;
                            vm.pointTool = false;
                        } else {
                            vm.getDetailsTool = false;
                            vm.getDetailsDestination = null;
                        }
                    }

                    // function for toggling the above
                    vm.togglePointTool = function () {
                        vm.pointTool = !vm.pointTool;

                        vm.getDetailsTool = false;
                        vm.drawingTool = false;
                    };

                    vm.toggleDeleteTool = function() {
                        vm.pointTool = false;
                        vm.drawingTool = false;

                        vm.drawInteraction.setActive(vm.drawingTool);

                        vm.getDetailsTool = false;
                        vm.deleteTool = !vm.deleteTool;


                        vm.setFeatureAsDestroyed = false;
                    }

                    // function for toggling the above + the interaction
                    vm.toggleDrawingTool = function () {
                        vm.pointTool = false;
                        vm.deleteTool = false;
                        vm.drawingTool = !vm.drawingTool;

                        vm.drawInteraction.setActive(vm.drawingTool);
                    };

                    hotkeys.bindTo($scope).add({
                        combo : 'p',
                        description : 'vm',
                        callback : function () {
                            console.log(angular.copy(vm));
                        }
                    });

                    hotkeys.bindTo($scope).add({
                        combo : 'ä',
                        description : 'map',
                        callback : function () {
                            var vmMap = angular.copy(vm.map);
                            olData.getMap(vm.mapId).then(function(map) {
                                console.log(".1:" + vmMap.getView().getCenter());
                                console.log(".2:" + map.getView().getCenter());
                            });

                        }
                    });

                    /*
                     * Center the map to the location of the kohde
                     */
                    vm.centerToLocation = function() {
                        if (vm.alakohde.sijainnit[0]) {
                            var prj = null;
                            if(vm.alakohde.sijainnit[0].geometry.type === 'Point') {
                                // Transform the coordinates
                                var prj = ol.proj.transform([
                                    vm.alakohde.sijainnit[0].geometry.coordinates[0],
                                    vm.alakohde.sijainnit[0].geometry.coordinates[1]
                                ], 'EPSG:4326', 'EPSG:3067').map(function(c) {
                                    return c.toFixed(4);
                                });
                            } else if(vm.alakohde.sijainnit[0].geometry.type === 'Polygon') {
                                var prj = ol.proj.transform([
                                    vm.alakohde.sijainnit[0].geometry.coordinates[0][0][0],
                                    vm.alakohde.sijainnit[0].geometry.coordinates[0][0][1]
                                ], 'EPSG:4326', 'EPSG:3067').map(function(c) {
                                    return c.toFixed(4);
                                });
                            }

                            if(prj) {
                                var lat = parseFloat(prj[1]);
                                var lon = parseFloat(prj[0]);

                                // Center the map to the coordinates
                                vm.center.lat = lat;
                                vm.center.lon = lon;
                            }
                        }
                    };

                    vm.showMap = true;

                }

        ]);
