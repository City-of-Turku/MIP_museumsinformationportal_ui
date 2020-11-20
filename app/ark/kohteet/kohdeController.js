/**
 * Kohteen controller
 */
angular.module('mip.kohde').controller(
    'KohdeController',
    [
        '$scope', 'CONFIG', 'KuntaService', 'ModalService', 'AlertService', 'MapService', '$timeout', '$rootScope', 'olData', '$popover',
        'hotkeys', 'ListService', 'FileService', 'locale', 'MuutoshistoriaService', 'UserService', 'permissions', 'NgTableParams', '$filter',
        'SessionService', 'selectedModalNameId', 'KohdeService', 'existing', 'kohde', 'ModalControllerService', '$q', 'KiinteistoService',
        'EntityBrowserService', 'TutkimusService', 'coordinates', 'LocationService',
        function ($scope, CONFIG, KuntaService, ModalService, AlertService, MapService, $timeout, $rootScope, olData, $popover,
            hotkeys, ListService, FileService, locale, MuutoshistoriaService, UserService, permissions, NgTableParams, $filter,
            SessionService, selectedModalNameId, KohdeService, existing, kohde, ModalControllerService, $q, KiinteistoService,
            EntityBrowserService, TutkimusService, coordinates, LocationService) {
            var vm = this;

            /**
             * Controllerin set-up. Suoritetaan ainoastaan kerran.
             * Pidetään huoli siitä, että kun näkymä on ladattu, niin kartta on valmiina ja käytettävissä.
             *
             */
            vm.setUp = function () {
                angular.extend(vm, ModalControllerService);
                vm.entity = 'kohde';
                vm.setModalId();

                vm.setMapId('kohde');
                vm.setMapPopupId();
                // Valitun modalin nimi ja järjestysnumero
                vm.modalNameId = selectedModalNameId;

                vm.center = {
                    lat: null,
                    lon: null,
                    autodiscover: false,
                    bounds: []
                };


                // Get the kohde that was selected (if any;
                // will be empty if creating a new one)
                // Set the julkinen value to Yes by default.
                if (kohde) {
                    vm.kohde = kohde;

                    //Täytetään _P ja _I
                    if (vm.kohde.properties.sijainnit && vm.kohde.properties.sijainnit[0] && vm.kohde.properties.sijainnit[0].geometry.type === 'Point') {
                        var convertedCoords = MapService.epsg4326ToEpsg3067(vm.kohde.properties.sijainnit[0].geometry.coordinates[0], vm.kohde.properties.sijainnit[0].geometry.coordinates[1]);

                        vm._P = convertedCoords[1];
                        vm._I = convertedCoords[0];
                    }
                } else {
                    // Alustetaan default arvot
                    vm.kohde = {
                        'properties': {
                            'koordinaattijarjestelma': 'EUREF',
                            'sijainnit': [],
                            'maakuntanimi': CONFIG.PROVINCE_NAME,
                            'ajoitukset': [],
                            'tyypit': [],
                            'kunnatkylat': [],
                            'suojelutiedot': [],
                            'kiinteistotrakennukset': [],
                            'suojelutiedot': [],
                            'alakohteet': [],
                            'vanhat_kunnat': [],
                            'vedenalainen': false,
                            'kunto': { id: 1 }, //Oletuksena "Ei määritelty"
                            'yllapitoorganisaatiotunnus': CONFIG.KYPPI_ADMIN_ORGANISATION_CODE,
                            'yllapitoorganisaatio': CONFIG.ORGANISATION,
                            'inventointitutkimukset': []
                        },
                        geometry: null,
                        type: 'Feature'
                    };
                }

                // Store the original kohde for possible
                // cancel operation
                vm.original = angular.copy(vm.kohde);

                // existing = true when viewing an existing property
                // false when creating a new one
                if (!existing) {
                    vm.edit = true;
                    vm.create = true;
                }

                // Store permissions to projekti entities to scope
                vm.permissions = permissions;

                // Vain pääkäyttäjä voi lähettää uusia kohteita muinaisjäännösrekisteriin.
                var props = UserService.getProperties();
                vm.rooli = props.user.ark_rooli;
                vm.lisaa_muinaisjaannos_oikeus = false;

                if (vm.rooli === 'pääkäyttäjä' && !vm.kohde.properties.muinaisjaannostunnus) {
                    vm.lisaa_muinaisjaannos_oikeus = true;
                }

                // all possible layers; shown in dropdown button
                vm.objectLayers = [
                    {
                        "value": "Kohteet",
                        "label": locale.getString('ark.Targets')
                    },
                    {
                        "value": "Alakohteet",
                        "label": locale.getString('ark.Subtargets')
                    },
                    {
                        "value": "Reitit",
                        "label": locale.getString('map.Routes')
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

                /**
                 * TODO:
                 * Jos koordinaatit on annettu (tullaan ns. isolta kartalta), haetaan automaattisesti
                 * sijainnista kiinteistötiedot, rakennustiedot (ja aineistokysely kyppiin?)
                 */


                vm.getDetailsTool = false;
                vm.getDetailsDestination = null;

                // is the point setting tool active or not? Defaults to not
                vm.pointTool = false;

                vm.deleteTool = false;

                //Merkitäänkö asetettava piste/alue tuhoutuneeksi
                vm.setFeatureAsDestroyed = false;

                /**
                 * Polygonin piirtoon vaadittavat muuttujat ja interaktiot
                 */
                // is the drawing tool active or not? Defaults to not
                vm.drawingTool = false;

                vm.drawingSource = new ol.source.Vector({
                    useSpatialIndex: false
                });

                vm.drawingLayer = new ol.layer.Vector({
                    source: vm.drawingSource
                });

                vm.drawInteraction = new ol.interaction.Draw({
                    source: vm.drawingSource,
                    type: 'Polygon'
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
                        if (mapLayer.name == 'Kohteet') {
                            // featureCoordArray will have the
                            // coordinates in GeoJSON format,
                            // propsCoords will have them in a "flat"
                            // string
                            var featureCoordArray = [], propsCoords = "", coords3067 = "";

                            // get the coordinates of the new feature,
                            // convert and store them
                            for (var i = 0; i < event.feature.getGeometry().flatCoordinates.length; i += 2) {
                                // coords3067 used in kiinteistofetch
                                coords3067 += event.feature.getGeometry().flatCoordinates[i];
                                coords3067 += ",";
                                coords3067 += event.feature.getGeometry().flatCoordinates[i + 1];
                                coords3067 += " ";

                                var lonlat = MapService.epsg3067ToEpsg4326(event.feature.getGeometry().flatCoordinates[i], event.feature.getGeometry().flatCoordinates[i + 1]);
                                featureCoordArray.push(lonlat);

                                if (i > 0) {
                                    propsCoords += ","
                                }
                                propsCoords += lonlat[0];
                                propsCoords += " " + lonlat[1];
                            }

                            var geometry = {
                                type: "Polygon",
                                coordinates: [
                                    featureCoordArray
                                ]
                            };

                            // create the feature for the map layer
                            var feature = {
                                type: "Feature",
                                geometry: geometry,
                                id: vm.kohde.properties.sijainnit.length * -1,
                                properties: { 'tuhoutunut': vm.setFeatureAsDestroyed }
                            };

                            /*
                             * Haetaan aluerajauksella löytyvät kiinteistöt ja niiden rakennukset, joiden alta löytyvät osoitteet.
                             * Tuodaan näytölle kaikki kiinteistöt osoitteineen, joista käyttäjä poistaa ne mitä ei tallenneta.
                             */
                            KohdeService.getKiinteistoJaRakennusTiedotForPolygon(coords3067).then(function (kiinteistoData) {

                                if (kiinteistoData.features.length > 0) {

                                    vm.muodostaOsoitteet(kiinteistoData.features);
                                    AlertService.showInfo(locale.getString('ark.Estate_search_successful'));
                                }

                            }, function error() {
                                AlertService.showError(locale.getString('common.Error'), locale.getString('error.Estate_provider_could_not_be_contacted'));
                            });

                            // add the newly drawn feature to the
                            // correct layer
                            //mapLayer.source.geojson.object.features.push(feature);



                            // set the coordinates so that they are
                            // POSTed or PUT
                            vm.kohde.properties.sijainnit.push(feature);
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
                    vm.centerToExtent(vm.kohde.properties.sijainnit);

                });

                $scope.focusInput = false;

                // Haetaan _käyttäjän_ aktiiviset inventointitutkimukset jos käyttäjä on katselija
                // Muun roolisille haetaan kaikki aktiiviset inventointitutkimukset
                vm.aktiivisetInventointitutkimukset = [];
                TutkimusService.getAktiivisetInventointitutkimukset().then(function success(data) {
                    vm.aktiivisetInventointitutkimukset = data.features;
                    vm.naytaTutkimukset(); // Ladataan tutkimukset-taulukko uudelleen
                }, function error(data) {
                    locale.ready('common').then(function () {
                        AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                    });
                });

            };
            vm.setUp();

            /**
             * Kohteen tutkimusten taulu
             */
            vm.naytaTutkimukset = function () {
                vm.tutkimukset = [];
                var kaikkiTutkimukset = vm.kohde.properties.tutkimukset;

                // Jos kyseessä on katselija, hän saa nähdä ainoastaan valmiit & julkiset tutkimukset JA
                // kaikki inventointitutkimukset
                if(kaikkiTutkimukset) {
                    if (vm.permissions.katselu && !vm.permissions.muokkaus) {
                        for (var i = 0; i < kaikkiTutkimukset.length; i++) {
                            var tutki = kaikkiTutkimukset[i];
                            if (tutki.valmis == true && tutki.julkinen == true) {
                                vm.tutkimukset.push(tutki);
                            }
                        }
                    } else if (vm.permissions.muokkaus) {
                        // Muokkausoikeuksilla näkee kaikki kohteen tutkimukset
                        vm.tutkimukset = vm.kohde.properties.tutkimukset;
                    }
                }
                if(vm.permissions.katselu && !vm.permissions.muokkaus) {
                    for(var i = 0; i<vm.kohde.properties.inventointitutkimukset.length; i++) {
                        var t = vm.kohde.properties.inventointitutkimukset[i];
                        vm.tutkimukset.push(t);
                    }
                } else if(vm.rooli != 'katselija') { // Muut kuin katselijat näkevät kaikki inventointitutkimukset
                    vm.tutkimukset = vm.tutkimukset.concat(vm.kohde.properties.inventointitutkimukset);
                }

                vm.kohdeTutkimuksetTable = new NgTableParams({
                    page: 1,
                    count: 500,
                    total: 500
                }, {
                    defaultSort: "asc",
                    data: vm.tutkimukset
                });
            };
            vm.naytaTutkimukset();

            /*
             * Jos uusi tutkimus lisätään päivitetään taulukko.
             */
            $scope.$on('Update_data', function (event, data) {

                if (data.type !== 'tutkimus') {
                    return;
                }
                KohdeService.fetchKohde(vm.kohde.properties.id).then(function (kohde) {
                    if (kohde) {
                        vm.kohde = kohde;
                        vm.naytaTutkimukset();
                    }
                });
            });

            /**
             * Avaa linkistä valitun tutkimuksen omaan ikkunaan
             */
            vm.avaaTutkimus = function (tutkimus) {
                TutkimusService.haeTutkimus(tutkimus.id).then(function (tutkimus) {
                    // Välitetään servicelle tutkimukset
                    EntityBrowserService.setQuery('tutkimus', tutkimus.properties.id, { 'tutkimus_lista': vm.tutkimukset }, vm.tutkimukset.length);
                    ModalService.tutkimusModal(true, tutkimus, null);
                });
            };

            /**
             * MML hausta palautettujen osoitteiden purku
             */
            vm.muodostaOsoitteet = function (kiinteistot) {

                var kuntanumero = kiinteistot[0].properties.kuntanumero;

                for (var i = 0; i < kiinteistot.length; i++) {
                    var mml_properties = kiinteistot[i].properties;

                    // Luodaan kiinteistö jolla tiedot välitetään. Kunta ja posno on sama kaikilla kiinteistön osoitteilla, joten viedään isännän mukana
                    var kiinteisto = {
                        'kiinteistotunnus': mml_properties.kiinteistotunnus,
                        'kiinteisto_nimi': mml_properties.nimi,
                        'rakennustunnus': '',
                        'osoitteet': []
                    };

                    // Haetaan osoitteet ensimmäiseltä löytyvältä rakennukselta. Oletuksena että ovat samat kaikille rakennuksille
                    if (mml_properties.rakennukset.length > 0) {
                        var mml_rakennus = mml_properties.rakennukset[0];

                        // Rakennustunnus välitetään, vaikkei näytöllä
                        if (!kiinteisto.rakennustunnus) {
                            kiinteisto.rakennustunnus = mml_rakennus.rakennustunnus;
                        }

                        // Osoitteet listalle. Kunta ja postinumero asetettava osoitteelle erikseen.
                        if (mml_rakennus.osoitteet.length > 0) {
                            for (var j = 0; j < mml_rakennus.osoitteet.length; j++) {
                                var osoite = mml_rakennus.osoitteet[j];
                                osoite.kuntanimi = mml_rakennus.kunta;
                                osoite.postinumero = mml_rakennus.postinumero;
                                kiinteisto.osoitteet.push(osoite);
                            }
                        }
                    }

                    //console.log(JSON.stringify(kiinteisto));
                    // Asetetaan muodostettu kiinteistö listalle
                    vm.kohde.properties.kiinteistotrakennukset.push(kiinteisto);
                }
                // Päivitetään kohteen kunnaksi aina kiinteistön kunta
                if (kuntanumero) {
                    vm.asetaKunta(kuntanumero);
                }
            };

            /*
             * Yhden kiinteistö-rakennuksen osoitteiden muodostus
             */
            vm.muodostaOsoite = function (mml_kiinteisto) {

                var mml_props = mml_kiinteisto[0].properties;
                var kuntanumero = mml_props.kuntatunnus;

                /*
                 * Kiinteistötunnuksen muotoilu väliviivoin (pituus). Palautuu rakennushausta ilman viivoja.
                 * Kunta (3)
                 * Sijaintialue (3)
                 * Ryhmä (4)
                 * Yksikkö (4)
                 */
                var kiinteistotunnus = '';
                if (mml_props.kiinteistotunnus) {
                    var kuntaosa = mml_props.kiinteistotunnus.substring(0, 3) + '-';
                    var sijaintialue = mml_props.kiinteistotunnus.substring(3, 6) + '-';
                    var ryhma = mml_props.kiinteistotunnus.substring(6, 10) + '-';
                    var yksikko = mml_props.kiinteistotunnus.substring(10);

                    kiinteistotunnus = kuntaosa + sijaintialue + ryhma + yksikko;
                }

                // Luodaan kiinteistö jolla tiedot välitetään.
                var kiinteisto = {
                    'kiinteistotunnus': kiinteistotunnus,
                    'kiinteisto_nimi': mml_props.tilanNimi,
                    'rakennustunnus': mml_props.rakennustunnus,
                    'osoitteet': []

                };

                // Osoitteet listalle. Kunta ja postinumero asetettava osoitteelle erikseen.
                if (mml_props.osoitteet.length > 0) {
                    for (var i = 0; i < mml_props.osoitteet.length; i++) {
                        var osoite = mml_props.osoitteet[i];
                        osoite.kuntanimi = mml_props.kuntanimiFin;
                        osoite.postinumero = mml_props.postinumero;
                        kiinteisto.osoitteet.push(osoite);
                    }
                }

                // Asetetaan muodostettu kiinteistö listalle
                vm.kohde.properties.kiinteistotrakennukset.push(kiinteisto);

                // Päivitetään kohteen kunnaksi aina kiinteistön kunta, jos sitä ei vielä ole listassa
                if (kuntanumero) {
                    vm.asetaKunta(kuntanumero);
                }
            };

            /*
             * Kiinteistöjen haun mukainen kunta asetetaan kohteelle.
             */
            vm.asetaKunta = function (kuntanumero) {

                var params = {
                    'kuntanumero': kuntanumero
                }

                // Haetaan kuntanumerolla
                KuntaService.getKunnat(params).then(function success(data) {
                    if (data) {
                        // jos kunnat/kylät listassa ei ole vielä kyseistä kuntaa, lisätään se
                        for (var i = 0; i < vm.kohde.properties.kunnatkylat.length; i++) {
                            if (vm.kohde.properties.kunnatkylat[i].kunta.id == data.features[0].properties.id) {
                                return;
                            }
                        }
                        var kyla = {};
                        var kunta = {
                            'id': data.features[0].properties.id,
                            'nimi': data.features[0].properties.nimi,
                            'kuntanumero': data.features[0].properties.kuntanumero
                        };
                        var kylaOptions = [
                            {
                                'id': null,
                                'nimi': null,
                                'kylanumero': null
                            }
                        ]
                        var kehys = {
                            'kyla': kyla,
                            'kunta': kunta,
                            'kylaOptions': kylaOptions
                        }
                        vm.kohde.properties.kunnatkylat.push(kehys);

                        // Päivittää kylät mipkylakuntavalitsin.js:ssä (kuntaChanged)
                        $scope.directiveFn();
                    }
                }, function error(data) {
                    AlertService.showError(locale.getString('error.Getting_counties_failed'), AlertService.message(data));
                });
            };

            $scope.DirectiveFn = function (directiveFn) {
                $scope.directiveFn = directiveFn;
            };

            /**
             * Kiinteistön haku kiinteistötunnuksella
             */
            vm.showKiinteistoModal = function (kiinteistotunnus) {
                KiinteistoService.haeKiinteistotunnuksella(kiinteistotunnus).then(function (kiinteisto) {
                    EntityBrowserService.setQuery('kiinteisto', kiinteisto.properties.id, { 'rakennus_id': kiinteisto.properties.id }, 1);
                    ModalService.kiinteistoModal(kiinteisto, null);
                }, function error(data) {
                    locale.ready('building').then(function () {
                        AlertService.showError(locale.getString('error.Getting_estate_details_failed'), AlertService.message(data));
                    });
                });
            }

            /**
             * Keskitetään kartta. Pitää olla timeoutin sisällä, muuten ei vaikutusta
             */
            vm.centerToExtent = function (data) {
                $timeout(function () {
                    if (vm.map) {
                        var kohdeExtent = MapService.calculateExtentOfFeatures(data);

                        var oldExtent = angular.copy(vm.extent);
                        vm.extent = MapService.getBiggestExtent(vm.extent, kohdeExtent);

                        if (oldExtent !== vm.extent) {
                            MapService.centerToExtent(vm.map, vm.extent);
                        }
                    }
                });
            }

            /*
             * Tyhjennetään vaatii tarkastusta tiedon muistiinpanot, jos valitaan Ei
             */
            vm.tyhjennaMuistiinpano = function () {
                if (!vm.kohde.properties.vaatii_tarkastusta) {
                    vm.kohde.properties.tarkastus_muistiinpano = null;
                }
            }

            /**
             * Taulukon kolumnien tekstien haku
             */
            vm.getColumnName = function (column, lang_file) {
                var str;

                if (lang_file) {
                    str = lang_file + '.' + column;
                } else {
                    str = 'common.' + column;
                }

                return locale.getString(str);
            }

            /**
             * ModalHeader kutsuu scopesta closea
             */
            $scope.close = function () {
                vm.close();
                $scope.$destroy();
            };

            /**
             * Cancel edit mode additional steps
             */
            vm._cancelEdit = function () {
                vm.updateLayerData('Kohteet');
                vm.updateLayerData('Alakohteet');
                vm.edit = false;
                vm.inventointitiedot = {};
                vm.kohde.properties.inventointitiedot = {};
            };

            /**
             * Tarkistaa kohteen tiedot muinaisjäännösrekisteristä ja päivittää Mip:iin.
             * Sulkee ja avaa modaalin päivitetyillä tiedoilla.
             */
            vm.tarkistaKyppiTiedot = function () {
                KohdeService.tuoKyppiKohde(vm.kohde.properties.muinaisjaannostunnus).then(function (kyppiData) {

                    vm.disableButtonsFunc();

                    // Suljetaan
                    vm.close();
                    $scope.$destroy();

                    // Avataan uudelleen
                    KohdeService.fetchKohde(vm.kohde.properties.id).then(function (kohde) {
                        ModalService.kohdeModal(kohde);
                    });

                    AlertService.showInfo(locale.getString('common.Save_ok'), locale.getString('ark.Mjr_data_import'));
                }, function error() {
                    AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Mjr_data_import'));
                    vm.disableButtonsFunc();
                });

            };

            /**
             * Avaa alakohteen muokkausnäkymä
             */
            vm.editAlakohde = function (alakohde) {
                ModalService.alakohdeModal(alakohde, vm.modalId);
            };
            /**
             * Alakohteen poisto - päivitetään myös tason source
             */
            vm.deleteAlakohde = function (index) {
                vm.kohde.properties.alakohteet.splice(index, 1);
                vm.updateLayerData('Alakohteet');
            };

            /**
             * Alakohteen controller broadcastaa eventtiä. Jos tämä controller on sitä pyytänyt, lisätään alakohde
             * tämän kohteen alakohteet-listaan. Päivitetään myös alakohteet tason source samalla.
             *
             * HUOM: Olemassa olevan alakohteen muokkaus ei lähetä eventtiä, koska objekti on sama joka tästä näkymästä
             * on annettu alakohteen controllerille, muokkaukset tapahtuvat suoraan tämän kohteen alakohteen listan elementtiin.
             */
            $scope.$on('Alakohde_lisatty', function (event, data) {
                if (data.modalId != vm.modalId) {
                    // this modal did not ask for the data
                    return;
                }

                vm.kohde.properties.alakohteet.push(data.alakohde);
                vm.updateLayerData('Alakohteet');

            });

            // Jos reittejä muokataan, päivitetään reittitason sisältö
            $scope.$on('Reitti_modified', function (event, data) {
                vm.updateLayerData('Reitit');
            });

            /**
             * Readonly / edit mode - additional steps
             */
            vm._editMode = function () {
                $scope.focusInput = true;
                vm.getUsers();
                //vm.originalFeatures = angular.copy(vm.features);
            };

            /**
             * Liitä kohde tutkimukseen. Avataan tutkimuksen lisäämisen näyttö
             */
            vm.liitaTutkimukseen = function () {

                ModalService.tutkimusModal(false, null, vm.kohde);
            };

            /**
             * Save changes
             */
            vm.save = function () {
                vm.disableButtonsFunc();

                vm.kohde.properties.inventointitiedot = vm.inventointitiedot;
                var count = 0;
                KohdeService.saveKohde(vm.kohde).then(function (id) {
                    if (vm.create) {
                        vm.kohde.properties["id"] = id;
                        vm.create = false;
                    }
                    vm.edit = false;
                    // Poistetaan mahdollinen ilmoitus Kypissä olevasta muutoksesta.
                    vm.kohde.properties.kyppi_updated = null;

                    EntityBrowserService.setQuery('kohde', vm.kohde.properties.id, { 'kohde_id': vm.kohde.properties.id }, 1);

                    // "update" the original after successful save
                    vm.original = angular.copy(vm.kohde);

                    vm.disableButtonsFunc();
                    AlertService.showInfo(locale.getString('common.Save_ok'), "");

                    // Jos inventointitiedot tallennettiin, broadcastataan tiedot ennen niiden tyhjäämistä
                    // Päivitetään myös inventointitutkimukset taulun tiedot
                    if(vm.inventointitiedot) {
                        $rootScope.$broadcast('Kohde_inventointi', {
                            'tutkimusId' : vm.inventointitiedot.inventointitutkimus_id,
                            'inventointiKohdeId' : vm.kohde.properties.id
                        });
                        var existingTutkimus = false;
                        var inventoijaNimi = "";
                        for(var i = 0; i<vm.users.length; i++) {
                            if(vm.users[i].properties.id == vm.inventointitiedot.inventoija_id) {
                                inventoijaNimi = vm.users[i].properties.sukunimi + " " + vm.users[i].properties.etunimi;
                            }
                        }
                        for(var i = 0; i<vm.tutkimukset.length; i++) {
                            if(vm.tutkimukset[i].id == vm.inventointitiedot.inventointitutkimus_id) {
                                existingTutkimus = true;
                                vm.tutkimukset[i].pivot = {'inventoija': inventoijaNimi, 'inventointipaiva': vm.inventointitiedot.inventointipaiva };
                                break;
                            }
                        }
                        if(!existingTutkimus) {
                            for(var i = 0; vm.aktiivisetInventointitutkimukset.length; i++) {
                                if(vm.aktiivisetInventointitutkimukset[i].properties.id == vm.inventointitiedot.inventointitutkimus_id) {
                                    vm.tutkimukset.push(vm.aktiivisetInventointitutkimukset[i].properties);
                                    vm.tutkimukset[vm.tutkimukset.length - 1].pivot = {'inventoija': inventoijaNimi, 'inventointipaiva': vm.inventointitiedot.inventointipaiva };
                                    break;
                                }
                            }

                        }
                    }

                    vm.inventointitiedot = {};
                    vm.kohde.properties.inventointitiedot = {};
                }, function error() {
                    AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
                    vm.disableButtonsFunc();
                });
            };

            /*
             * Delete
             */
            vm.deleteKohde = function (modalNameId) {
                var conf = confirm(locale.getString('common.Confirm_delete2', { 'item': vm.kohde.properties.nimi }));
                if (conf) {
                    KohdeService.deleteKohde(vm.kohde).then(function () {
                        vm.close();
                        $scope.$destroy();
                        locale.ready('common').then(function () {
                            AlertService.showInfo(locale.getString('common.Deleted'));
                        });
                    }, function error(data) {
                        locale.ready('area').then(function () {
                            AlertService.showError(locale.getString('area.Delete_failed'), AlertService.message(data));
                        });
                    });
                }
            };


            /*
             * Add image to the alue
             */
            vm.addImage = function () {
                ModalService.arkImageUploadModal('kohde', vm.kohde, false, null);
            };

            /*
             * Images
             */
            vm.images = [];
            vm.getImages = function () {
                if (vm.kohde.properties.id) {
                    FileService.getArkImages({
                        'jarjestys': 'ark_kuva.id',
                        'jarjestys_suunta': 'nouseva',
                        'rivit': 1000,
                        'ark_kohde_id': vm.kohde.properties.id,
                        'luetteloitu': false
                    }).then(function success(images) {
                        vm.images = images.features;
                        // Kuvien määrä (directives.js)
                        $scope.kuvia_kpl = vm.images.length;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            vm.getImages();

            /*
             * Open the selected image for viewing
             */
            vm.openImage = function (image) {
                ModalService.arkImageModal(image, 'kohde', vm.kohde, vm.permissions, vm.images, null);
            };

            /*
             * Images were modified, fetch them again
             */
            $scope.$on('arkKuva_modified', function (event, data) {
                vm.getImages();
            });

            /**
             * Lisää muinaisjäännös palvelun kutsu Kyppiin.
             */
            vm.lisaaMuinaisJaannos = function () {
                vm.disableButtonsFunc();

                KohdeService.lisaaMuinaisjaannos(vm.kohde.properties.id).then(function success() {
                    vm.disableButtonsFunc();

                    // Suljetaan
                    vm.close();
                    $scope.$destroy();

                    // Avataan uudelleen
                    KohdeService.fetchKohde(vm.kohde.properties.id).then(function (kohde) {
                        ModalService.kohdeModal(kohde);
                    });

                    AlertService.showInfo(locale.getString('common.Save_ok'), locale.getString('ark.Add_relic_register_successful'));
                }, function error(data) {
                    AlertService.showError(locale.getString('ark.Add_relic_register_failed'), AlertService.message(data));
                });
                vm.disableButtonsFunc();
            }

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
            vm.selectDefaultObjectLayers = function () {
                // Add default layer (kohteet)
                this.selectedLayers.push('Kohteet');
                this.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

                /*
                 * Add features, first select the layer and then set the layer source to the kohde.
                 */
                var kohdeLayer = null;
                for (var i = 0; i < vm.mapLayers.length; i++) {
                    if (vm.mapLayers[i].name == 'Kohteet') {
                        kohdeLayer = vm.mapLayers[i];
                        if (kohdeLayer != null) {
                            //kohdeLayer.source.geojson.object.features.length = 0;

                            //kohdeLayer.source.geojson.object.features = vm.kohde.properties.sijainnit;
                            vm.updateLayerData('Kohteet');
                        }
                        break;
                    }
                }

                // Add default layer (alakohteet)
                this.selectedLayers.push('Alakohteet');
                this.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

                var alakohdeLayer = null;
                for (var i = 0; i < vm.mapLayers.length; i++) {
                    if (vm.mapLayers[i].name == 'Alakohteet') {
                        alakohdeLayer = vm.mapLayers[i];
                        if (alakohdeLayer != null) {
                            vm.updateLayerData('Alakohteet');
                        }
                        break;
                    }
                }

            }

            /*
             * Select alue or arvoalue layers (or both)
             */
            vm.selectLayer = function () {
                vm.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

                for (var i = 0; i < vm.mapLayers.length; i++) {
                    if (vm.mapLayers[i].name == 'Kohteet') {
                        vm.updateLayerData('Kohteet');
                    }
                    else if (vm.mapLayers[i].name == 'Alakohteet') {
                        vm.updateLayerData('Alakohteet');
                    } else if (vm.mapLayers[i].name == 'Reitit') {
                        vm.updateLayerData('Reitit');
                    }
                }
            };

            /**
             * Controller-spesifinen funktio, jossa määritetään mitä dataa millekin controllerin käsittelemälle tasolle
             * asetetaan kun taso valitaan.
             */
            vm.updateLayerData = function (layerName) {
                var l = null;
                for (var i = 0; i < vm.mapLayers.length; i++) {
                    if (vm.mapLayers[i].name == layerName) {
                        l = vm.mapLayers[i];
                        break;
                    }
                }
                //If we found a valid layer and it's active (=is visible), get the features for the view.
                if (l && l.active) {
                    if (l.name == 'Kohteet') {
                        l.source.geojson.object.features = vm.kohde.properties.sijainnit;
                    } else if (l.name == 'Alakohteet') {
                        var features = [];
                        for (var i = 0; i < vm.kohde.properties.alakohteet.length; i++) {
                            if (vm.kohde.properties.alakohteet[i].sijainnit.length > 0) {
                                features = features.concat(vm.kohde.properties.alakohteet[i].sijainnit);
                            }
                        }
                        l.source.geojson.object.features = features;
                    } else if (l.name == 'Reitit') {
                        $scope.reitit = [];
                        if(vm.kohde.properties.id) {
                            LocationService.getReitit({ 'entiteettiTyyppi': 'Kohde', 'entiteettiId': vm.kohde.properties.id }).then(function success(data) {
                                l.source.geojson.object.features = data.features;
                                $scope.reitit = data.features;
                            }, function error(data) {
                                AlertService.showError("error.Getting_routes_failed");
                            });
                        }
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

            // Click handler of the map.
            $scope.$on('openlayers.map.singleclick', function (event, data) {
                var pixel = vm.map.getEventPixel(data.event.originalEvent);
                var layerHit = null;
                var featureHit = vm.map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                    layerHit = layer;
                    return feature;
                });
                if (vm.edit) {
                    if (vm.pointTool) {
                        // perform a transform to get understandable
                        // coordinates
                        var prj = ol.proj.transform([
                            data.coord[0], data.coord[1]
                        ], data.projection, 'EPSG:4326').map(function (c) {
                            return c.toFixed(8);
                        });

                        var lat = parseFloat(prj[1]);
                        var lon = parseFloat(prj[0]);

                        for (var i = 0; i < vm.mapLayers.length; i++) {
                            var mapLayer = vm.mapLayers[i];
                            if (mapLayer.name == 'Kohteet') {
                                var feature = {
                                    'type': 'Feature',
                                    'geometry': {
                                        'type': 'Point',
                                        'coordinates': [lon, lat],
                                        'id': vm.kohde.properties.sijainnit.length * -1
                                    },
                                    'properties': { 'tuhoutunut': vm.setFeatureAsDestroyed, 'nimi': vm.kohde.properties.nimi },
                                    'id': vm.kohde.properties.sijainnit.length * -1
                                };

                                vm.kohde.properties.sijainnit.push(feature);

                                //Jos tämä on ensimmäinen piste, asetetaan p ja i koordinaatit myös
                                //_P ja _I muuttujat ovat ainoastaan sitä varten, että käyttäjä voi kirjoittaa koordinaatit
                                //manuaalisesti kohteelle. Näitä ei kuitenkaan tallenneta, jos kohteella on useita sijainteja,
                                //joka tarkoittanee sitä, että käyttäjä on karttaa käyttäen asettanut sijainteja.
                                if (vm.kohde.properties.sijainnit.length === 1) {
                                    var convertedCoords = MapService.epsg4326ToEpsg3067(vm.kohde.properties.sijainnit[0].geometry.coordinates[0], vm.kohde.properties.sijainnit[0].geometry.coordinates[1]);

                                    vm._P = convertedCoords[1];
                                    vm._I = convertedCoords[0];
                                }

                                break;
                            }
                        }

                        /*
                         * Osoitteiden haku sijainti-pisteellä.
                         * Haetaan klikin koordinaateilla rakennus MML palvelusta.
                         * Jos löytyy, asetetaan kohteelle osoitteet
                         */
                        MapService.fetchBuildingDetails(null, data.coord[0] + " " + data.coord[1]).then(function success(data) {
                            // Osoitteiden parsinta näytölle
                            if (data.data.features) {
                                vm.muodostaOsoite(data.data.features);
                                AlertService.showInfo(locale.getString('ark.Estate_search_successful'));
                            } else {
                                AlertService.showInfo("", AlertService.message(data));
                            }
                        }, function error(err) {
                            locale.ready('error').then(function () {
                                AlertService.showError(locale.getString('common.Error'), AlertService.message(err));
                            });
                        });

                        // disengage point setting!
                        vm.togglePointTool();

                        // used to force the map to redraw
                        $scope.$apply();
                    } else if (vm.deleteTool) {

                        var pixel = vm.map.getEventPixel(data.event.originalEvent);
                        var layerHit = null;
                        var featureHit = vm.map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                            layerHit = layer;
                            return feature;
                        });
                        if (typeof featureHit !== 'undefined') {
                            if (layerHit.getProperties().name == 'Kohteet') {
                                var fid = featureHit.getId();

                                for (var i = 0; i < vm.kohde.properties.sijainnit.length; i++) {
                                    var sijainti = vm.kohde.properties.sijainnit[i];
                                    if (sijainti.id == fid) {
                                        //Poistetaan sijainti vm.kohde.properties.sijainnit-listasta
                                        //JA tasolta.
                                        vm.kohde.properties.sijainnit.splice(i, 1);
                                        //layerHit.getSource().removeFeature(featureHit); //Ei tarvita, koska sourcen featuret ovat sama kuin sijainnit.
                                        // Tyhjennetään koordinaatti input kentät
                                        vm._P = null;
                                        vm._I = null;
                                        break;
                                    }
                                }
                            }
                        }
                        vm.toggleDeleteTool();
                        // used to force the map to redraw
                        $scope.$apply();
                    } else if (vm.getDetailsTool) {
                        vm.getDetails(data.coord);
                        vm.toggleGetDetailsTool();
                    }
                } else { // Ei edit-mode
                    if (typeof featureHit !== 'undefined') {
                        if (layerHit.getProperties().name == 'Reitit') {
                            var featureId = featureHit.getProperties().id;
                            for (var i = 0; i < $scope.reitit.length; i++) {
                                if ($scope.reitit[i].properties.id === featureId) {
                                    ModalService.reittiModal($scope.reitit[i], 'arkeologia', 'ark_kohde', vm.kohde);
                                    break;
                                }
                            }

                        }
                    }
                }
            });

            vm.toggleGetDetailsTool = function (destination) {
                if (vm.getDetailsTool === false) {
                    vm.getDetailsTool = true;
                    vm.getDetailsDestination = destination;
                    vm.pointTool = false;
                } else {
                    vm.getDetailsTool = false;
                    vm.getDetailsDestination = null;
                }
            }

            // function for toggling the above
            vm.togglePointTool = function (tuhoutunut) {
                vm.pointTool = !vm.pointTool;

                vm.setFeatureAsDestroyed = tuhoutunut;

                vm.getDetailsTool = false;
                vm.drawingTool = false;
            };

            vm.toggleDeleteTool = function () {
                vm.pointTool = false;
                vm.drawingTool = false;

                vm.drawInteraction.setActive(vm.drawingTool);

                vm.getDetailsTool = false;
                vm.deleteTool = !vm.deleteTool;


                vm.setFeatureAsDestroyed = false;
            }

            // function for toggling the above + the interaction
            vm.toggleDrawingTool = function (tuhoutunut) {
                vm.pointTool = false;
                vm.deleteTool = false;
                vm.drawingTool = !vm.drawingTool;

                vm.setFeatureAsDestroyed = tuhoutunut;

                vm.drawInteraction.setActive(vm.drawingTool);

            };

            /**
             * Poistetaan kartalta piste sekä nollataan kohteen geometriatieto
             *//*
           vm.deletePoint = function() {
               for (var i = 0; i < vm.mapLayers.length; i++) {
                   var mapLayer = vm.mapLayers[i];
                   if (mapLayer.name == 'Kohteet') {
                       mapLayer.source.geojson.object.features.length = 0;
                       break;
                   }
               }
               vm.kohde.geometry.coordinates.length = 0;
           };
           */
            /**
             * GetDetails - Haetaan sijainnin tiedot KTJ, RHR ja tehdään valituille tasoille aineistokysely koordinaattien perusteella
             * TODO: Kaamea himmeli, tehtävä jotain
             */
            vm.getDetails = function (coord) {

                if (vm.getDetailsDestination === 'ktj') {
                    MapService.fetchEstateDetails(coord[0], coord[1]).then(function success(data) {
                        ModalService.kiinteistoFetchedDetailsModal(data, null, vm.modalId);
                    }, function error() {
                        locale.ready('estate').then(function () {
                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.Estate_provider_could_not_be_contacted'));
                        });
                    });
                } else if (vm.getDetailsDestination === 'rhr') {
                    MapService.fetchBuildingDetails(null, coord[0] + " " + coord[1]).then(function success(data) {
                        // The query can be successfull even though we receive 0 buildings - show the received details only if we received buildings.
                        if (data.data.features) {
                            ModalService.rakennusFetchedDetailsModal(data.data, null, vm.modalId);
                        } else {
                            AlertService.showInfo("", AlertService.message(data));
                        }
                    }, function error(err) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(err));
                        });
                    });
                } else if (vm.getDetailsDestination === 'taso') {
                    var layers = vm.map.getLayers();

                    var layerQueries = [];

                    var viewResolution = vm.map.values_.view.getResolution();

                    for (var j = 0; j < layers.array_.length; j++) {
                        var layer = layers.array_[j];
                        var source = layer.getSource();
                        if (source.__proto__.hasOwnProperty('getGetFeatureInfoUrl')) {

                            var url = source.getGetFeatureInfoUrl(coord, viewResolution, 'EPSG:3067', {
                                'INFO_FORMAT': 'text/plain',
                                'REQUEST': 'GetFeatureInfo',
                                'FEATURE_COUNT': 3
                            });

                            layerQueries.push(MapService.getFeatureInfo(url));
                        }
                    }


                    $q.all(layerQueries).then(function (data) {
                        vm.parseFeatureInfo(data);
                        //TODO: Avataan joku ikkuna, parsitaan tiedot näppärästi näkyville
                        //Annetaan käyttäjän valita mitä tietoja hän tallentaa kohteelle.
                    });
                }

            };

            vm.parseFeatureInfo = function (data) {
                if (!data) {
                    return;
                }

                var promises = [];
                var receivedMJs = null
                for (var i = 0; i < data.length; i++) {
                    if (data[i].indexOf('@Muinaisjäännökset_piste') > -1 || data[i].indexOf('@Muinaisjäännökset_alue') > -1) {
                        //Kiinteät muinaisjäännökset ja muut kulttuuriperintökohteet
                        var splittedData = data[i].split("Shape; ");
                        var splittedValues = splittedData[1].split(";");
                        var mjtunnus = splittedValues[1];

                        if (mjtunnus) {
                            promises.push(MapService.haeMuinaisjaannos(mjtunnus));
                        }
                    }
                }
                $q.all(promises).then(function (data) {
                    ModalService.muinaisjaannosFeatureInfoModal(data, vm.kohde, vm.modalId);
                }, function (error) {
                    console.log(error);
                });
            }

            /*
             * Jos kohteella ei ole yhtään sijaintia, asetetaan ensimmäisen sijainnin  koordinaatit näkyviin N ja E kenttiin.
             * Jos kohteella ei ole yhtään sijaintia ja käyttäjä syöttää kenttiin arvot, asetetaan piste kartalle.
             * Koordinaatteja ei itsessään tallenneta mihinkään, vaan jos kohteella ei ole yhtään sijaintia asetettuna ja
             * käyttäjä syöttää koordinaatit käsin, asetetaan tällöin piste.
             */
            vm.setLocation = function (tyyppi) {
                if ((!vm._P || !vm._I) || vm.kohde.properties.sijainnit.length > 1) {
                    return;
                }


                //JOS annettu koordinaatti on koordinaattiextension sisällä, jatketaan
                //Muutoin returnataan.
                // Rajat: 19.0900, 59.3000, 31.5900, 70.1300 (http://spatialreference.org/ref/epsg/etrs89-etrs-tm35fin/)
                //TODO: MapServiceen oma funkkari joka tarkastaa koordinaattien olevan oikealla alueella.

                //Asetetaan feature oikeaan kohtaan
                var coords = [vm._P, vm._I];
                var convertedCoords = MapService.epsg3067ToEpsg4326(vm._I, vm._P);

                if (convertedCoords[0] > 19.0900 && convertedCoords[0] < 59.3000 && convertedCoords[1] > 31.5900 && convertedCoords[1] < 70.1300) {

                    //Poistetaan ensimmäinen sijainti
                    vm.kohde.properties.sijainnit.splice(0, 1);

                    var feature = {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': convertedCoords,
                            'id': -1
                        },
                        'properties': { 'tuhoutunut': false, 'nimi': vm.kohde.properties.nimi },
                        'id': -1
                    };
                    vm.kohde.properties.sijainnit.push(feature);
                    vm.updateLayerData('Kohteet');
                    vm.centerToExtent(vm.kohde.properties.sijainnit);

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
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(err));
                        });
                    });
                }
            }

            /*
             * Muutoshistorian avaus
             */
            vm.showMuutoshistoria = function () {
                MuutoshistoriaService.getArkKohdeMuutoshistoria(vm.kohde.properties.id).then(function (historia) {
                    ModalService.kohdeMuutoshistoriaModal(historia, vm.kohde.properties.nimi);
                });
            };

            hotkeys.bindTo($scope).add({
                combo: 'å',
                description: 'vm',
                callback: function () {
                    console.log(vm);
                }
            });

            hotkeys.bindTo($scope).add({
                combo: 'ä',
                description: 'map',
                callback: function () {
                    var vmMap = angular.copy(vm.map);
                    olData.getMap(vm.mapId).then(function (map) {
                        console.log(".1:" + vmMap.getView().getCenter());
                        console.log(".2:" + map.getView().getCenter());
                    });

                }
            });

            vm.showMap = true;

            /*
             * Liitetiedostojen lisäys
             */
            vm.lisaaTiedosto = function () {
                //Avataan arkfileUploadController
                ModalService.arkFileUploadModal('kohde', vm.kohde/*, vm.tutkimusId*/);
            }

            vm.files = [];
            vm.getFiles = function () {
                if (vm.kohde.properties.id > 0) {
                    FileService.getArkFiles({
                        'jarjestys_suunta': 'nouseva',
                        'rivit': 1000,
                        'ark_kohde_id': vm.kohde.properties.id
                        //'ark_tutkimus_id': vm.tutkimusId
                    }).then(function success(files) {
                        vm.files = files.features;
                        // Tiedostojen määrä
                        vm.kpl_maara = vm.files.length;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_maps_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            vm.getFiles();

            /*
             * Open the selected file for viewing
             */
            vm.openFile = function (file) {
                ModalService.arkFileModal(file, 'kohde', vm.kohde, vm.permissions/*, vm.tutkimusId*/);
            };

            /*
             * files were modified, fetch them again
             */
            $scope.$on('arkFile_modified', function (event, data) {
                vm.getFiles();
            });

            $scope.$watch('vm.kohde.properties.laji', function (newValue, oldValue) {
                //Asetetaan suojelutyypiksi Muinaismuistolaki jos tyypiksi valitaan kiinteä muinaisjäännös (id 2)
                if (newValue && newValue.id === 2) {
                    vm.kohde.properties.suojelutiedot.push({
                        'suojelutyyppi_id': 10,
                        'suojelutyyppi': {
                            'id': 10,
                            'nimi_en': "Antiquities act",
                            'nimi_fi': "Muinaismuistolaki",
                            'nimi_se': "Lag om fornminnen"
                        }
                    });
                }
            });

            // Asetetaan sijainti automaattisesti jos kohde on uusi ja koordinaatit on annettu (= koordinaatit on asetettu pääkartalla).
            // Timeoutin sisällä, koska muutoin vm.mapLayers on tyhjä eikä featuren lisääminen Kohteet-tasolle onnistu.
            $timeout(function () {
                if (coordinates && !existing) {
                    for (var i = 0; i < vm.mapLayers.length; i++) {
                        var mapLayer = vm.mapLayers[i];
                        if (mapLayer.name == 'Kohteet') {
                            var feature = {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [coordinates[0], coordinates[1]],
                                    'id': vm.kohde.properties.sijainnit.length * -1
                                },
                                'properties': { 'tuhoutunut': false, 'nimi': vm.kohde.properties.nimi },
                                'id': vm.kohde.properties.sijainnit.length * -1
                            };

                            vm.kohde.properties.sijainnit.push(feature);

                            //Jos tämä on ensimmäinen piste, asetetaan p ja i koordinaatit myös
                            //_P ja _I muuttujat ovat ainoastaan sitä varten, että käyttäjä voi kirjoittaa koordinaatit
                            //manuaalisesti kohteelle. Näitä ei kuitenkaan tallenneta, jos kohteella on useita sijainteja,
                            //joka tarkoittanee sitä, että käyttäjä on karttaa käyttäen asettanut sijainteja.
                            if (vm.kohde.properties.sijainnit.length === 1) {
                                var convertedCoords = MapService.epsg4326ToEpsg3067(vm.kohde.properties.sijainnit[0].geometry.coordinates[0], vm.kohde.properties.sijainnit[0].geometry.coordinates[1]);

                                vm._P = convertedCoords[1];
                                vm._I = convertedCoords[0];
                            }

                            break;
                        }
                    }
                }
                vm.centerToExtent(vm.kohde.properties.sijainnit);
            }, 500);

            //Remove existing marker(s)
            vm.clearMarker = function () {
                vm.markers.length = 0;
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
                $timeout(function () {
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

            vm.locationService = LocationService;
            vm.getCurrentPosition = function () {
                vm.locationService.getCurrentPosition().then(function (coords) {
                    vm.center.lon = coords[0];
                    vm.center.lat = coords[1];
                    vm.showMarker(vm.center.lon, vm.center.lat);
                });

            };

            /*
             * Center the map to the location of the kohde
             */
            vm.centerToLocation = function () {
                if (vm.kohde.properties.sijainnit[0]) {
                    // Transform the coordinates of the estate
                    var prj = ol.proj.transform([
                        vm.kohde.properties.sijainnit[0].geometry.coordinates[0],
                        vm.kohde.properties.sijainnit[0].geometry.coordinates[1]
                    ], 'EPSG:4326', 'EPSG:3067').map(function (c) {
                        return c.toFixed(4);
                    });

                    var lat = parseFloat(prj[1]);
                    var lon = parseFloat(prj[0]);

                    // Center the map to the coordinates
                    vm.center.lat = lat;
                    vm.center.lon = lon;
                }
            };


            // Sisältää katselijan tekemään inventointiin liittyvät tiedot,
            // jotka kopioidaan kohteelle ennen savea, tyhjennetään cancelissa ja saven jälkeen
            vm.inventointitiedot = {};
            /*
             * Set the inventointiprojekti value or delete everything if no project selected.
             */
            vm.inventointitutkimusChanged = function () {
                if (vm.inventointitiedot.inventointitutkimus_id) {
                    vm.kohde.properties.inventointitiedot = { 'kohde_id': vm.kohde.properties.id };
                    // Asetetaan käyttäjä ja päivä automaattisesti jos inventoija tekee valintoja
                    if (vm.rooli == 'katselija') {
                        vm.inventointitiedot.inventoija_id = vm.users[0].properties.id;
                        vm.inventointitiedot.inventointipaiva = new Date();
                    }
                } else {
                    delete vm.kohde.properties.inventointitiedot;
                    delete vm.inventointitiedot;
                }
            };

            /*
             * Users
             */
            vm.users = [];
            vm.getUsers = function () {
                // It's inventor doing the job. We push only the inventor to the users list.
                if (vm.rooli == 'katselija') {
                    var user = {
                        'properties': {}
                    };
                    user.properties = UserService.getProperties().user;
                    vm.users = [];
                    vm.users.push(user);
                } else {
                    if (vm.create || (vm.edit && vm.users.length == 0)) {
                        UserService.getUsers({
                            'rivit': 1000000,
                            'jarjestys': 'etunimi',
                            'aktiivinen': 'true'
                        }).then(function success(users) {
                            vm.users = users.features;
                        }, function error(data) {
                            locale.ready('error').then(function () {
                                AlertService.showError(locale.getString("error.Getting_inventor_list_failed"), AlertService.message(data));
                            })
                        });
                    }
                }
            };
            vm.getUsers();

            vm.allowSave = function() {
                if($scope.form.$invalid) {
                    return false;
                }
                if(vm.kohde.properties.tyhja == false && (vm.kohde.properties.ajoitukset.length == 0 || vm.kohde.properties.tyypit.length == 0)) {
                    return false;
                }
                if(vm.rooli == 'katselija' && (!vm.inventointitiedot.inventointitutkimus_id || !vm.inventointitiedot.inventoija_id || !vm.inventointitiedot.inventointipaiva)) {
                    return false;
                }
                return true;
            }
        }
    ]
);
