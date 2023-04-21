/*
 * Controller for Map main view. The markers are shown on map. Aside is used for filtering. Clicking on a marker opens up the modal and shows the details for the marker.
 */

angular.module('mip.map', []);

angular.module('mip.map').controller(
    'MapController',
    [
        '$scope', 'TabService', '$location', 'KiinteistoService', 'ModalService', 'KuntaService', 'CONFIG', '$compile', 'olData', 'RakennusService', 'MapService',
        'AlueService', 'ArvoalueService', '$timeout', 'ListService', 'locale', '$rootScope', 'InventointiprojektiService', 'hotkeys', 'Auth', 'UserService', '$q',
        'EntityBrowserService', '$filter', 'SuunnittelijaService', 'AlertService', 'KylaService', 'KohdeService', 'LocationService', 'TutkimusService',
        function ($scope, TabService, $location, KiinteistoService, ModalService, KuntaService, CONFIG, $compile, olData, RakennusService, MapService,
            AlueService, ArvoalueService, $timeout, ListService, locale, $rootScope, InventointiprojektiService, hotkeys, Auth, UserService, $q,
            EntityBrowserService, $filter, SuunnittelijaService, AlertService, KylaService, KohdeService, LocationService, TutkimusService) {

            $scope.locationService = LocationService;

            var projection = $rootScope.projection;
            var projectionExtent = projection.getExtent();
            var size = ol.extent.getWidth(projectionExtent) / 256;
            var resolutions = [
                8192.00000000000000000000, 4096.00000000000000000000, 2048.00000000000000000000, 1024.00000000000000000000, 512.00000000000000000000, 256.00000000000000000000, 128.00000000000000000000, 64.00000000000000000000,
                32.00000000000000000000, 16.00000000000000000000, 8.00000000000000000000, 4.00000000000000000000, 2.00000000000000000000, 1.00000000000000000000, 0.50000000000000000000, 0.25000000000000000000
            ];
            var matrixIds = new Array(16);
            for (var z = 0; z < 16; ++z) {
                // generate resolutions and matrixIds arrays for this WMTS
                resolutions[z] = size / Math.pow(2, z);
                matrixIds[z] = z;
            }

            //for translations ot work
            $scope.selectText = locale.getString('common.Select');
            $scope.textSelectMapLayers = locale.getString('common.Map_layers');
            $scope.textSelectLayers = locale.getString('common.Layers');

            // Holders for the search items.
            // ui-select requires them to be introduced, otherwise the control won't work.

            $scope.ui = {}; //Holder for some the ui-select controls
            $scope.ui.searchInventointiprojektiId = "";
            $scope.ui.searchInventoija = "";
            $scope.ui.searchLuoja = "";
            $scope.ui.searchDesigner = "";
            $scope.kiinteistoTotal = '';
            $scope.rakennusTotal = '';
            $scope.alueTotal = '';
            $scope.arvoalueTotal = '';
            $scope.kohdeTotal = '';
            $scope.ui.searchCounty = '';

            $scope.show = locale.getString('common.Show');

            $scope.projectionExtent = projectionExtent;


            $scope.selectedTab = "RAK";
            $scope.setSelectedTab = function(tab) {
                $scope.selectedTab = tab;
            };

            $scope.showCreateNewKiinteistoButton = false;
            $scope.showCreateNewKohdeButton = false;
            Auth.checkPermissions("rakennusinventointi", "kiinteisto").then(function (permissions) {
                if (permissions.luonti) {
                    $scope.showCreateNewKiinteistoButton = true;
                }
            });

            Auth.checkPermissions("arkeologia", "ark_kohde").then(function (permissions) {
                if (permissions.luonti) {
                    $scope.showCreateNewKohdeButton = true;
                } else {
                    // Tarkastetaan vielä onko käyttäjä liitettynä inventointitutkimuksiin
                    TutkimusService.getAktiivisetInventointitutkimukset().then(function success(data) {
                        if(data.features.length > 0) {
                            $scope.showCreateNewKohdeButton = true;
                        }
                    }, function error(data) {
                        locale.ready('common').then(function () {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                        });
                    });
                }
            });

            /*
             * TAB BAR. Kartan alivälilehti asetetaan RAK inventoinnin alivälilehden mukaan, jos valittuna.
             * Oletuksena kiinteistöt.
             */
            locale.ready('common').then(function () {
                $rootScope.setActiveTab(locale.getString('common.Map'));

                // checkboxien alustus
                $scope.kiinteisto_tab = false;
                $scope.rakennus_tab = false;
                $scope.alue_tab = false;
                $scope.arvoalue_tab = false;
                $scope.kohde_tab = false;
                $scope.tutkimus_tab = false;

                if ($rootScope.activeSubTab === locale.getString('common.Estates')) {
                    $scope.kiinteisto_tab = true;
                } else if ($rootScope.activeSubTab === locale.getString('common.Buildings')) {
                    $scope.rakennus_tab = true;
                } else if ($rootScope.activeSubTab === locale.getString('common.Areas')) {
                    $scope.alue_tab = true;
                } else if ($rootScope.activeSubTab === locale.getString('common.Valueareas')) {
                    $scope.arvoalue_tab = true;
                } else if ($rootScope.activeSubTab === locale.getString('ark.Targets')) {
                    $scope.kohde_tab = true;
                } else if ($rootScope.activeSubTab === locale.getString('common.Researchers')) {
                    $scope.tutkimus_tab = true;
                }
            });

            /*
             * Inventory projects
             */
            $scope.inventointiprojektit = [];
            $scope.getInventointiprojektit = function (search) {
                var searchObj = { 'rivit': 25, 'jarjestys': 'nimi', 'tekninen_projekti': 'false' };
                if (search) {
                    searchObj['nimi'] = search
                }
                var ipPromise = InventointiprojektiService.getInventointiprojektit(searchObj);
                ipPromise.then(function success(results) {
                    $scope.inventointiprojektit.length = 0;

                    /*
                     * Stripataan propertyt pois - ui-select ei meinaa toimia niiden kanssa.
                     */
                    for (var i = 0; i < results.features.length; i++) {
                        $scope.inventointiprojektit.push(results.features[i].properties);
                    }
                });
            }
            $scope.getInventointiprojektit();

            /*
             * Inventoijat. To be filled after the inventory project has been selected.
             */
            $scope.inventoijat = [];

            /*
             * Kayttajat. To be filled later
             */
            $scope.kayttajat = [];

            $scope.searchCount = "100"; // The default value
            // kiinteistoPages : total_count / searchCount
            // this is the kiinteisto paginator
            $scope.kiinteistoPages = [
                {
                    'id': 1,
                    'rivi': 0,
                    active: true
                }
            ];
            $scope.rakennusPages = [
                {
                    'id': 1,
                    'rivi': 0,
                    active: true
                }
            ];
            $scope.aluePages = [
                {
                    'id': 1,
                    'rivi': 0,
                    active: true
                }
            ];
            $scope.arvoaluePages = [
                {
                    'id': 1,
                    'rivi': 0,
                    active: true
                }
            ];
            $scope.kohdePages = [
                {
                    'id': 1,
                    'rivi': 0,
                    active: true
                }
            ];
            $scope.tutkimusPages = [
                {
                    'id': 1,
                    'rivi': 0,
                    active: true
                }
            ];


            /*
             * Map layer menu (base layers, NOT feature layers)
             */
            $scope.availableMapLayers = [];
            $scope.selectedMapLayers = [];

            /*
             * Select the default layer after the available layers are loaded
             */
            function selectDefaultLayer(layers) {

                // Get the users layer preferences and select them automatically.
                var userLayers = MapService.getUserLayers();

                for (var i = 0; i < userLayers.length; i++) {
                    for (var j = 0; j < layers.length; j++) {
                        if (userLayers[i] == layers[j].properties.nimi) {
                            $scope.selectedMapLayers.push(layers[j].properties);
                        }
                    }
                }

                $scope.selectMapLayer(true);
            }

            /*
             * Populate map layer menu
             */
            MapService.getAvailableMapLayers().then(function success(layers) {

                $scope.availableMapLayers = layers;

                selectDefaultLayer(layers);

                // $scope.selectMapLayer();
            }, function error(error) {
                locale.ready('error').then(function () {
                    AlertService.showWarning(locale.getString('error.Search_failed'), locale.getString('error.Getting_available_map_layers_failed'));
                });
            });

            // this holds all the paginators (TODO: the rest)
            $scope.paginators = [
                $scope.kiinteistoPages, $scope.rakennusPages, $scope.aluePages, $scope.arvoaluePages, $scope.kohdePages, $scope.tutkimusPages
            ];
            // The default values
            $scope.selectedKiinteistoPage = $scope.kiinteistoPages[0];
            $scope.selectedRakennusPage = $scope.rakennusPages[0];
            $scope.selectedAluePage = $scope.aluePages[0];
            $scope.selectedArvoaluePage = $scope.arvoaluePages[0];
            $scope.selectedKohdePage = $scope.kohdePages[0];
            $scope.selectedTutkimusPage = $scope.tutkimusPages[0];

            $scope.changeKiinteistoPage = function (page) {
                for (var i = 0; i < $scope.kiinteistoPages.length; i++) {

                    $scope.kiinteistoPages[i].active = false;
                    if ($scope.kiinteistoPages[i].id == page.id) {
                        $scope.kiinteistoPages[i].active = true;
                        $scope.selectedKiinteistoPage = $scope.kiinteistoPages[i];
                    }
                }

                $scope.search(false, 'Kiinteistot');
            };

            $scope.changeRakennusPage = function (page) {
                for (var i = 0; i < $scope.rakennusPages.length; i++) {

                    $scope.rakennusPages[i].active = false;
                    if ($scope.rakennusPages[i].id == page.id) {
                        $scope.rakennusPages[i].active = true;
                        $scope.selectedRakennusPage = $scope.rakennusPages[i];
                    }
                }

                $scope.search(false, 'Rakennukset');
            };

            $scope.changeAluePage = function (page) {
                for (var i = 0; i < $scope.aluePages.length; i++) {

                    $scope.aluePages[i].active = false;
                    if ($scope.aluePages[i].id == page.id) {
                        $scope.aluePages[i].active = true;
                        $scope.selectedAluePage = $scope.aluePages[i];
                    }
                }

                $scope.search(false, 'Alueet');
            };

            $scope.changeArvoaluePage = function (page) {
                for (var i = 0; i < $scope.arvoaluePages.length; i++) {

                    $scope.arvoaluePages[i].active = false;
                    if ($scope.arvoaluePages[i].id == page.id) {
                        $scope.arvoaluePages[i].active = true;
                        $scope.selectedArvoaluePage = $scope.arvoaluePages[i];
                    }
                }

                $scope.search(false, 'Arvoalueet');
            };

            $scope.changeKohdePage = function (page) {
                for (var i = 0; i < $scope.kohdePages.length; i++) {

                    $scope.kohdePages[i].active = false;
                    if ($scope.kohdePages[i].id == page.id) {
                        $scope.kohdePages[i].active = true;
                        $scope.selectedKohdePage = $scope.kohdePages[i];
                    }
                }

                $scope.search(false, 'Kohteet');
            };

            $scope.changeTutkimusPage = function (page) {
                for (var i = 0; i < $scope.tutkimusPages.length; i++) {

                    $scope.tutkimusPages[i].active = false;
                    if ($scope.tutkimusPages[i].id == page.id) {
                        $scope.tutkimusPages[i].active = true;
                        $scope.selectedTutkimusPage = $scope.tutkimusPages[i];
                    }
                }

                $scope.search(false, 'Tutkimusalueet');
            };

            $scope.getInventoijat = function (search) {
                $scope.inventoijat.length = 0;
                if ($scope.ui.searchInventointiprojektiId) {
                    var inventoijaPromise = InventointiprojektiService.getInventoijatOfInventointiprojekti($scope.ui.searchInventointiprojektiId);
                    inventoijaPromise.then(function success(data) {
                        if (data.features) {
                            for (var i = 0; i < data.features.length; i++) {
                                $scope.inventoijat.push(data.features[i].properties);
                            }

                            for (var i = 0; i < $scope.inventoijat.length; i++) {
                                $scope.inventoijat[i].tyyppi = locale.getString('common.Inventors');
                            }

                            var muutInventoijatPromise = InventointiprojektiService.getMuutInventoijatOfInventointiprojekti($scope.ui.searchInventointiprojektiId);
                            muutInventoijatPromise.then(function success(data) {
                                for (var i = 0; i < data.features.length; i++) {
                                    data.features[i].properties.tyyppi = locale.getString('common.OtherInventors');
                                    $scope.inventoijat.push(data.features[i].properties);
                                }

                                //Filter the list using the search term. We match against etunimi or sukunimi.
                                $scope.inventoijat = ($filter('filter')($scope.inventoijat, { 'etunimi': search }) || $filter('filter')($scope.inventoijat, { 'sukunimi': search }));
                            });
                        }
                    }, function error(data) {
                        locale.ready('common').then(function () {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                        });
                    });
                } else {

                    var s = {
                        'rivit': 20,
                        'jarjestys': 'sukunimi',
                        'aktiivinen': 'true',
                        'inventoijat': true
                    };
                    if (search) {
                        s['nimi'] = search;
                    }

                    UserService.getUsers(s).then(function success(users) {
                        for (var i = 0; i < users.features.length; i++) {
                            $scope.inventoijat.push(users.features[i].properties);
                        }
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_inventor_list_failed"), AlertService.message(data));
                        })
                    });
                }
            };
            $scope.getInventoijat();

            $scope.getKayttajat = function (search) {
                $scope.kayttajat.length = 0;

                var s = {
                    'rivit': 20,
                    'jarjestys': 'sukunimi'
                };
                if (search) {
                    s['nimi'] = search;
                }

                UserService.getUsers(s).then(function success(users) {
                    for (var i = 0; i < users.features.length; i++) {
                        $scope.kayttajat.push(users.features[i].properties);
                    }
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_users_failed"), AlertService.message(data));
                    })
                });
            };
            $scope.getKayttajat();

            $scope.search = function (rebuildPaginators, layerToRefresh, centerToResult) {
                // If inventory project has been selected, fetch the inventors of the inventory project
                // $scope.getInventoijat();
                if (typeof rebuildPaginators === 'undefined') {
                    rebuildPaginators = true;
                }

                if (typeof layerToRefresh === 'undefined') {
                    layerToRefresh = null;
                }

                if (layerToRefresh == null) {
                    MapService.nukeLayers($scope.mapLayers);
                } else {
                    MapService.nukeLayer($scope.mapLayers, layerToRefresh);
                }

                if (centerToResult == undefined) {
                    centerToResult = true;
                    MapService.setNeedToCenter(true);
                } else {
                    centerToResult = false;
                    MapService.setNeedToCenter(false);
                }
                if ($scope.initialCenterNeed == true) {
                    centerToResult = true;
                    MapService.setNeedToCenter(true);
                    $scope.initialCenterNeed = false;
                }

                $scope.selectLayer(rebuildPaginators, centerToResult);
            };

            // layers selected for showing; note, $scope.mapLayers holds
            // the "real" layers that are
            // drawn on the map; these are object (feature) layers
            $scope.selectedLayers = [];

            $scope.isLayerSelected = function (layer) {
                var index = $scope.selectedLayers.indexOf(layer);
                if (index === -1) {
                    return false;
                } else {
                    return true;
                }
            }

            // all possible layers; shown in dropdown button
            $scope.objectLayers = [
                {
                    "value": "Kiinteistot",
                    "label": locale.getString('common.Estates')
                }, {
                    "value": "Rakennukset",
                    "label": locale.getString('common.Buildings')
                }, {
                    "value": "Alueet",
                    "label": locale.getString('common.Areas')
                }, {
                    "value": "Arvoalueet",
                    "label": locale.getString('common.Valueareas')
                }, {
                    "value": "Kohteet",
                    "label": locale.getString('ark.Targets')
                }, {
                    "value": "Tutkimusalueet",
                    "label": locale.getString('common.Researches')
                }
                /*
                 * The following are not used currently , { "value" : "Matkaraportit", "label" : "Matkaraportit" }, { "value" : "Inventointiprojektit", "label" : "Inventointiprojektit" }, { "value" : "Suunnittelijat", "label" : "Suunnittelijat" }, { "value" : "Kunnat", "label" : "Kunnat" }, {
                 * "value" : "Kylat", "label" : "Kylät" }
                 */
            ];

            // Kun controlleri startataan ja meillä on hakuehtoja asetettuna, tarkastetaan tarviiko karttaa keskittää muualle.
            $scope.initialCenterNeed = false;
            $scope.getSearchValues = function () {
                var searchProps = ListService.getProps();
                var value = "";
                var filter = {
                    'properties': {}
                };

                /*
                 * FETCH SEARCH PARAMS
                 */
                // Kiinteistonimi overrides aluenimi etc...
                if (ListService.getProp('alueNimi')) {
                    $scope.searchAreaName = ListService.getProp('alueNimi');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('arvoalueNimi')) {
                    $scope.searchValueareaName = ListService.getProp('arvoalueNimi');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('kiinteistoNimi')) {
                    $scope.searchEstateName = ListService.getProp('kiinteistoNimi');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('kiinteistotunnus')) {
                    $scope.searchEstateNumber = ListService.getProp('kiinteistotunnus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('palstanumero')) {
                    $scope.searchEstateColumnNumber = ListService.getProp('palstanumero');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('inventointinumero')) {
                    $scope.searchInventoryNumber = ListService.getProp('inventointinumero');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('rakennustyyppi')) {
                    $scope.ui.searchRakennustyyppi = ListService.getProp('rakennustyyppi');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('rakennustunnus')) {
                    $scope.searchRakennustunnus = ListService.getProp('rakennustunnus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('rakennustyypin_kuvaus')) {
                    $scope.searchRakennustyypin_kuvaus = ListService.getProp('rakennustyypin_kuvaus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('rakennusvuosi_alku')) {
                    $scope.searchRakennusvuosi_alku = ListService.getProp('rakennusvuosi_alku');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('rakennusvuosi_lopetus')) {
                    $scope.searchRakennusvuosi_lopetus = ListService.getProp('rakennusvuosi_lopetus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('rakennusvuosi_kuvaus')) {
                    $scope.searchRakennusvuosi_kuvaus = ListService.getProp('rakennusvuosi_kuvaus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('muutosvuosi_alku')) {
                    $scope.searchMuutosvuosi_alku = ListService.getProp('muutosvuosi_alku');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('muutosvuosi_lopetus')) {
                    $scope.searchMuutosvuosi_lopetus = ListService.getProp('muutosvuosi_lopetus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('muutosvuosi_kuvaus')) {
                    $scope.searchMuutosvuosi_kuvaus = ListService.getProp('muutosvuosi_kuvaus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('alkuperainen_kaytto')) {
                    $scope.ui.searchAlkuperainen_kaytto = ListService.getProp('alkuperainen_kaytto');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('nykykaytto')) {
                    $scope.ui.searchNykykaytto = ListService.getProp('nykykaytto');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('perustus')) {
                    $scope.ui.searchPerustus = ListService.getProp('perustus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('runko')) {
                    $scope.ui.searchRunko = ListService.getProp('runko');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('katto')) {
                    $scope.ui.searchKatto = ListService.getProp('katto');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('vuoraus')) {
                    $scope.ui.searchVuoraus = ListService.getProp('vuoraus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('kate')) {
                    $scope.ui.searchKate = ListService.getProp('kate');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('kunto')) {
                    $scope.ui.searchKunto = ListService.getProp('kunto');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('nykytyyli')) {
                    $scope.ui.searchNykytyyli = ListService.getProp('nykytyyli');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('purettu')) {
                    $scope.ui.searchPurettu = ListService.getProp('purettu');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('kulttuurihistorialliset_arvot')) {
                    $scope.ui.searchKulttuurihistorialliset_arvot = ListService.getProp('kulttuurihistorialliset_arvot');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('kuvaukset')) {
                    $scope.searchKuvaukset = ListService.getProp('kuvaukset');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('suunnittelija')) {

                    SuunnittelijaService.getSuunnittelijat({ 'rivit': 10, 'jarjestys': 'nimi', 'id': ListService.getProp('suunnittelija') }).then(function success(result) {
                        $scope.suunnittelijat.length = 0;
                        $scope.suunnittelijat.push(result.features[0].properties);
                        $scope.ui.searchDesigner = result.features[0].properties.id;

                        $scope.initialCenterNeed = true;
                        $timeout(function () {
                            $scope.search();
                        }, 250);

                    });
                }
                if (ListService.getProp('osoite')) {
                    $scope.searchAddress = ListService.getProp('osoite');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('arvotus')) {
                    $scope.ui.searchArvotus = ListService.getProp('arvotus');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('paikkakunta')) {
                    $scope.searchPaikkakunta = ListService.getProp('paikkakunta');
                    $scope.initialCenterNeed = true;
                }

                //TODO: 10029 Kohde ?
                if (searchProps['kuntaId']) {
                    $scope.ui.searchCounty = ListService.getProp('kuntaId');
                    $scope.initialCenterNeed = true;
                    if ($scope.mapLayers !== undefined) {
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP kiinteistöt', 'kunta_id', $scope.ui.searchCounty);
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP rakennukset', 'kunta_id', $scope.ui.searchCounty);
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP alueet', 'kunta_id', $scope.ui.searchCounty);
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP arvoalueet', 'kunta_id', $scope.ui.searchCounty);
                    }
                }
                if (ListService.getProp('kylaId')) {
                    $scope.ui.searchVillage = ListService.getProp('kylaId');
                    $scope.initialCenterNeed = true;
                    if ($scope.mapLayers !== undefined) {
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP kiinteistöt', 'kyla_id', $scope.ui.searchVillage);
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP rakennukset', 'kyla_id', $scope.ui.searchVillage);
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP alueet', 'kyla_id', $scope.ui.searchVillage);
                        $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP arvoalueet', 'kyla_id', $scope.ui.searchVillage);
                    }
                }
                if (ListService.getProp('aluetyyppi')) {
                    $scope.ui.searchAluetyyppi = ListService.getProp('aluetyyppi');
                    $scope.initialCenterNeed = true;
                }
                if (ListService.getProp('inventointiprojektiId')) {
                    InventointiprojektiService.getInventointiprojektit({
                        'rivit': 10,
                        'jarjestys': 'nimi',
                        'inventointiprojektiId': ListService.getProp('inventointiprojektiId')
                    }).then(function success(results) {
                        $scope.inventointiprojektit.length = 0;
                        $scope.inventointiprojektit.push(results.features[0].properties);

                        if ($scope.inventointiprojektit.length == 1) {
                            $scope.ui.searchInventointiprojektiId = $scope.inventointiprojektit[0].id;
                            $scope.initialCenterNeed = true;

                            if ($scope.inventointiprojektit.length == 1 && searchProps['inventoija'].length == 0) {
                                $scope.getInventoijat();
                            }
                            $timeout(function () {
                                $scope.search();
                            }, 250);
                        }
                    });
                }
                if (ListService.getProp('inventoija')) {

                    $scope.ui.searchInventoija = searchProps['inventoija'];
                    UserService.getUsers({ 'rivit': 10, 'jarjestys': 'sukunimi', 'id': ListService.getProp('inventoija') }).then(function success(result) {
                        $scope.inventoijat.length = 0;
                        $scope.inventoijat.push(result.features[0].properties);

                        $scope.initialCenterNeed = true;
                        $timeout(function () {
                            $scope.search();
                        }, 250);

                    });
                }

                if (ListService.getProp('luoja')) {
                    $scope.ui.searchLuoja = searchProps['luoja'];
                    UserService.getUsers({ 'rivit': 10, 'jarjestys': 'sukunimi', 'id': ListService.getProp('luoja') }).then(function success(result) {
                        $scope.kayttajat.length = 0;
                        $scope.kayttajat.push(result.features[0].properties);

                        $scope.initialCenterNeed = true;
                        $timeout(function () {
                            $scope.search();
                        }, 250);

                    });
                }


                if (ListService.getProp('kohdelajit')) {
                    $scope.ui.searchKohdeLajit = ListService.getProp('kohdelajit');
                    $scope.initialCenterNeed = true;
                }

                if (ListService.getProp('kohdetyypit')) {
                    $scope.ui.searchKohdeTyypit = ListService.getProp('kohdetyypit');
                    $scope.initialCenterNeed = true;
                }

                if (ListService.getProp('kohdetyyppitarkenteet')) {
                    $scope.ui.searchKohdeTyyppitarkenteet = ListService.getProp('kohdetyyppitarkenteet');
                    $scope.initialCenterNeed = true;
                }

                if (ListService.getProp('ajoitukset')) {
                    $scope.ui.searchKohdeAjoitukset = ListService.getProp('ajoitukset');
                    $scope.initialCenterNeed = true;
                }

                if (ListService.getProp('tutkimuslajit')) {
                    $scope.ui.searchTutkimusLajit = ListService.getProp('tutkimuslajit');
                    $scope.initialCenterNeed = true;
                }


                if(ListService.getProp('tyhja')) {
                    $scope.ui.searchKohdeTyhjakohde = ListService.getProp('tyhja');
                    $scope.initialCenterNeed = true;
                }

                if(ListService.getProp('vaatii_tarkastusta')) {
                    $scope.ui.searchVaatiiTarkastusta = ListService.getProp('vaatii_tarkastusta');
                    $scope.initialCenterNeed = true;
                }

                if(ListService.getProp('kyppitilat')) {
                    $scope.ui.searchKohdeKyppitilat = ListService.getProp('kyppitilat');
                    $scope.initialCenterNeed = true;
                }

                if(ListService.getProp('tutkimus_valmis')) {
                    $scope.ui.searchTutkimusValmis = ListService.getProp('tutkimus_valmis');
                    $scope.initialCenterNeed = true;
                }

                if(ListService.getProp('tutkimus_julkinen')) {
                    $scope.ui.searchTutkimusJulkinen = ListService.getProp('tutkimus_julkinen');
                    $scope.initialCenterNeed = true;
                }

                if(ListService.getProp('kenttatyo_alkuvuosi')) {
                    $scope.ui.searchKenttatyoAlkuvuosi = ListService.getProp('kenttatyo_alkuvuosi');
                    $scope.initialCenterNeed = true;
                }
                if(ListService.getProp('kenttatyo_paatosvuosi')) {
                    $scope.ui.searchKenttatyoPaatosvuosi = ListService.getProp('kenttatyo_paatosvuosi');
                    $scope.initialCenterNeed = true;
                }

                if(ListService.getProp('kenttatyojohtaja')) {
                    $scope.ui.searchKenttatyoJohtaja = ListService.getProp('kenttatyojohtaja');
                    $scope.initialCenterNeed = true;
                }

                if(ListService.getProp('loyto_paanumero')) {
                    $scope.ui.searchLoytoPaanumero = ListService.getProp('loyto_paanumero');
                    $scope.initialCenterNeed = true;
                }
            }

            $scope.clearInventors = function () {
                $scope.ui.searchInventoija = "";
                $scope.getInventoijat();
            };
            $scope.clearLuoja = function () {
                $scope.ui.searchLuoja = "";
                $scope.getKayttajat();
            };

            $scope.fetchParamsAndDefaultLayer = function () {

                $scope.kiinteisto_taso = false;
                $scope.rakennus_taso = false;
                $scope.alue_taso = false;
                $scope.arvoalue_taso = false;
                $scope.kohde_taso = false;
                $scope.tutkimus_taso = false;
                //TODO: Tee kaikki kohteeseen liittyvät tutkimukselle

                /*
                 * Oletus tason haku ja välilehden checkboxin asetus.
                 */
                if (MapService.getDefaultLayer() != "") {
                    $scope.selectedLayers.push(MapService.getDefaultLayer());

                    switch (MapService.getDefaultLayer()) {
                        case 'Kiinteistot':
                            $scope.kiinteisto_taso = true;
                            break;
                        case 'Rakennukset':
                            $scope.rakennus_taso = true;
                            break;
                        case 'Alueet':
                            $scope.alue_taso = true;
                            break;
                        case 'Arvoalueet':
                            $scope.arvoalue_taso = true;
                            break;
                        case 'Kohteet':
                            $scope.kohde_taso = true;
                            break;
                        case 'Tutkimusalueet':
                            $scope.tutkimus_taso = true;
                            break;
                        default:
                            break;
                    }
                }

                /*
                 * Search params getting removed by request.
                 */
                $scope.getSearchValues();
            };

            $scope.fetchParamsAndDefaultLayer();

            /*
             * Välilehtien tasojen valinnan checkboxit
             */
            $scope.asetaTasoChBox = function () {

                var ki = $scope.selectedLayers.indexOf('Kiinteistot');
                if ($scope.kiinteisto_taso) {
                    if (ki === -1) {
                        $scope.selectedLayers.push('Kiinteistot');
                    }
                } else {
                    if (ki > -1) {
                        $scope.selectedLayers.splice(ki, 1);
                    }
                }

                var ri = $scope.selectedLayers.indexOf('Rakennukset');
                if ($scope.rakennus_taso) {
                    if (ri === -1) {
                        $scope.selectedLayers.push('Rakennukset');
                    }
                } else {
                    if (ri > -1) {
                        $scope.selectedLayers.splice(ri, 1);
                    }
                }

                var ai = $scope.selectedLayers.indexOf('Alueet');
                if ($scope.alue_taso) {
                    if (ai === -1) {
                        $scope.selectedLayers.push('Alueet');
                    }
                } else {
                    if (ai > -1) {
                        $scope.selectedLayers.splice(ai, 1);
                    }
                }

                var aai = $scope.selectedLayers.indexOf('Arvoalueet');
                if ($scope.arvoalue_taso) {
                    if (aai === -1) {
                        $scope.selectedLayers.push('Arvoalueet');
                    }
                } else {
                    if (aai > -1) {
                        $scope.selectedLayers.splice(aai, 1);
                    }
                }

                var kohdeIndex = $scope.selectedLayers.indexOf('Kohteet');
                if ($scope.kohde_taso) {
                    if (kohdeIndex === -1) {
                        $scope.selectedLayers.push('Kohteet');
                    }
                } else {
                    if (kohdeIndex > -1) {
                        $scope.selectedLayers.splice(kohdeIndex, 1);
                    }
                }

                var tutkimusIndex = $scope.selectedLayers.indexOf('Tutkimusalueet');
                if ($scope.tutkimus_taso) {
                    if (tutkimusIndex === -1) {
                        $scope.selectedLayers.push('Tutkimusalueet');
                    }
                } else {
                    if (tutkimusIndex > -1) {
                        $scope.selectedLayers.splice(tutkimusIndex, 1);
                    }
                }

                // Päivitetään tason tiedot
                $scope.selectLayer();
            };

            /*
             * Välilehtien tasojen checkboxien arvojen asetus jos tasoja muokattu dialogin kautta.
             */
            $scope.asetaTasoDialogista = function () {
                if ($scope.selectedLayers.indexOf('Kiinteistot') > -1) {
                    $scope.kiinteisto_taso = true;
                } else {
                    $scope.kiinteisto_taso = false;
                }
                if ($scope.selectedLayers.indexOf('Rakennukset') > -1) {
                    $scope.rakennus_taso = true;
                } else {
                    $scope.rakennus_taso = false;
                }
                if ($scope.selectedLayers.indexOf('Alueet') > -1) {
                    $scope.alue_taso = true;
                } else {
                    $scope.alue_taso = false;
                }
                if ($scope.selectedLayers.indexOf('Arvoalueet') > -1) {
                    $scope.arvoalue_taso = true;
                } else {
                    $scope.arvoalue_taso = false;
                }
                if ($scope.selectedLayers.indexOf('Kohteet') > -1) {
                    $scope.kohde_taso = true;
                } else {
                    $scope.kohde_taso = false;
                }
                if ($scope.selectedLayers.indexOf('Tutkimusalueet') > -1) {
                    $scope.tutkimus_taso = true;
                } else {
                    $scope.tutkimus_taso = false;
                }
            };

            /*
             * MAP
             */
            // Set default position for map as we may not have the
            // coordinates
            $scope.lat = CONFIG.DEFAULT_COORDINATES[0];
            $scope.lon = CONFIG.DEFAULT_COORDINATES[1];

            // this holds the layers that are shown on the map
            $scope.mapLayers = [];

            $scope.selectMapLayer = function (initial) {
                // Hack: for some reason this doesn't work on the first time for the WMTS layers...
                $scope.selectedMapLayers = MapService.selectBaseLayer($scope.mapLayers, $scope.selectedMapLayers);
                $scope.selectedMapLayers = MapService.selectBaseLayer($scope.mapLayers, $scope.selectedMapLayers);

                //Assign the search values - especially the setViewParams to the geoserver layers for filtering the geoserver layers.
                $scope.getSearchValues();

                if (!initial) {
                    // Update the user's map layer preferences
                    if ($scope.selectedMapLayers.length > 0) {
                        var arrayOfLayers = [];
                        for (var i = 0; i < $scope.selectedMapLayers.length; i++) {
                            arrayOfLayers.push($scope.selectedMapLayers[i].nimi);
                        }
                        MapService.setUserLayers(arrayOfLayers);
                    }
                }

                //Unselect the queryLayer
                $scope.queryLayer = null;

            };
            $scope.searchObj = {};

            /*
             * Tason järjestyksen ja läpinäkyvyyen tallennus MapService:lle.
             * zIndex ja opacity.
             */
            $scope.tallennaTasot = function (editLayer) {
                // Valittuna olevat tasot
                var layers = $scope.mainMap.getLayers();
                // Välitetään muokatun maplayerin tiedot palvelulle, joka huolehtii arvojen säilyttämisen
                MapService.storeUserMapLayerValues(layers, editLayer);

                locale.ready('common').then(function () {
                    AlertService.showInfo(locale.getString('common.Save_ok'));
                });
            };
            /*
             * Generate the search parameters according the entered fields and values
             * NS. Mäppäys UI-kontrollien modelin ja http-pyynnössä lähtevän arvon välillä tehdään tässä.
             */
            $scope.selectLayer = function (rebuildPaginators, centerTo, chBox) {
                if (typeof rebuildPaginators === 'undefined') {
                    rebuildPaginators = true;
                }

                if (centerTo == undefined) {
                    centerTo = false;
                }
                // Klikattu tason valinta välilehden checkboxista
                if (chBox) {
                    $scope.asetaTasoChBox();
                } else {
                    $scope.asetaTasoDialogista();
                }

                $scope.searchObj = {};

                $scope.searchObj['rivit'] = $scope.searchCount;
                $scope.searchObj['rivi'] = 0;
                // can't store paginator row choices in the above
                // property, as they are
                // different for each paginator, so we'll use custom
                // properties:
                $scope.searchObj['_kiinteisto_rivi'] = $scope.selectedKiinteistoPage['rivi'];
                $scope.searchObj['_rakennus_rivi'] = $scope.selectedRakennusPage['rivi'];
                $scope.searchObj['_alue_rivi'] = $scope.selectedAluePage['rivi'];
                $scope.searchObj['_arvoalue_rivi'] = $scope.selectedArvoaluePage['rivi'];
                $scope.searchObj['_kohde_rivi'] = $scope.selectedKohdePage['rivi'];
                $scope.searchObj['_tutkimus_rivi'] = $scope.selectedTutkimusPage['rivi'];
                // TODO should probably sanitize said custom properties
                // before firing
                // AJAX requests to the backend... See
                // mapService.showKiinteistot

                // not just fetching because a new page was selected;
                // the map bounds have changed
                if (rebuildPaginators) {
                    $scope.searchObj['rivi'] = 0;
                    $scope.searchObj['_kiinteisto_rivi'] = 0;
                    $scope.searchObj['_rakennus_rivi'] = 0;
                    $scope.searchObj['_alue_rivi'] = 0;
                    $scope.searchObj['_arvoalue_rivi'] = 0;
                    $scope.searchObj['_kohde_rivi'] = 0;
                    $scope.searchObj['_tutkimus_rivi'] = 0;
                }
                // TODO: 10029 Kohde
                if ($scope.ui.searchCounty) {
                    $scope.searchObj['kuntaId'] = $scope.ui.searchCounty;
                    ListService.setProp('kuntaId', $scope.ui.searchCounty);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP kiinteistöt', 'kunta_id', $scope.ui.searchCounty);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP rakennukset', 'kunta_id', $scope.ui.searchCounty);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP alueet', 'kunta_id', $scope.ui.searchCounty);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP arvoalueet', 'kunta_id', $scope.ui.searchCounty);
                } else {
                    ListService.setProp('kuntaId', '');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP kiinteistöt', 'kunta_id');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP rakennukset', 'kunta_id');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP alueet', 'kunta_id');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP arvoalueet', 'kunta_id');
                }
                if ($scope.ui.searchVillage) {
                    $scope.searchObj['kylaId'] = $scope.ui.searchVillage;
                    ListService.setProp('kylaId', $scope.ui.searchVillage);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP kiinteistöt', 'kyla_id', $scope.ui.searchVillage);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP rakennukset', 'kyla_id', $scope.ui.searchVillage);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP alueet', 'kyla_id', $scope.ui.searchVillage);
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP arvoalueet', 'kyla_id', $scope.ui.searchVillage);
                } else {
                    ListService.setProp('kylaId', '');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP kiinteistöt', 'kyla_id');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP rakennukset', 'kyla_id');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP alueet', 'kyla_id');
                    $scope.mapLayers = MapService.setViewParam($scope.mapLayers, 'POHJAKARTTA_MIP arvoalueet', 'kyla_id');
                }

                if ($scope.searchEstateNumber) {
                    $scope.searchObj['kiinteistotunnus'] = $scope.searchEstateNumber;
                    ListService.setProp('kiinteistotunnus', $scope.searchEstateNumber);
                } else {
                    ListService.setProp('kiinteistotunnus', '');
                }
                if ($scope.searchEstateColumnNumber) {
                    $scope.searchObj['palstanumero'] = $scope.searchEstateColumnNumber;
                    ListService.setProp('palstanumero', $scope.searchEstateColumnNumber);
                } else {
                    ListService.setProp('palstanumero', '');
                }

                if ($scope.searchName) {
                    $scope.searchObj['nimi'] = $scope.searchName;
                    $scope.searchObj['nimi'] = $scope.searchName;
                    $scope.searchObj['nimi'] = $scope.searchName;
                    ListService.setProp('kiinteistoNimi', $scope.searchName);
                    ListService.setProp('alueNimi', $scope.searchName);
                    ListService.setProp('arvoalueNimi', $scope.searchName);
                    ListService.setProp('kohdeNimi', $scope.searchName);
                    ListService.setProp('tutkimusNimi', $scope.searchName);
                } else {
                    ListService.setProp('kiinteistoNimi', '');
                    ListService.setProp('alueNimi', '');
                    ListService.setProp('arvoalueNimi', '');
                    ListService.setProp('kohdeNimi', '');
                    ListService.setProp('tutkimusNimi', '');
                }

                if ($scope.searchEstateName) {
                    $scope.searchObj['kiinteistoNimi'] = $scope.searchEstateName;
                    ListService.setProp('kiinteistoNimi', $scope.searchEstateName);

                    //Add viewParams filtering to the layer
                    for (var i = 0; i < $scope.mapLayers.length; i++) {
                        var l = $scope.mapLayers[i];
                        if (l.name == 'POHJAKARTTA_Kiinteistöt') {
                            l.source.params['viewparams'] = 'kiinteisto_nimi:' + $scope.searchEstateName;
                        }
                    }
                } else {
                    ListService.setProp('kiinteistoNimi', '');
                }
                if ($scope.searchAreaName) {
                    $scope.searchObj['alueNimi'] = $scope.searchAreaName;
                    ListService.setProp('alueNimi', $scope.searchAreaName);
                } else {
                    ListService.setProp('alueNimi', '');
                }

                if ($scope.searchValueareaName) {
                    $scope.searchObj['arvoalueNimi'] = $scope.searchValueareaName;
                    ListService.setProp('arvoalueNimi', $scope.searchValueareaName);
                } else {
                    ListService.setProp('arvoalueNimi', '');
                }
                if ($scope.searchTargetName) {
                    $scope.searchObj['kohdeNimi'] = $scope.searchTargetName;
                    ListService.setProp('kohdeNimi', $scope.searchTargetName);
                } else {
                    ListService.setProp('kohdeNimi', '');
                }

                if ($scope.searchAddress) {
                    $scope.searchObj['osoite'] = $scope.searchAddress;
                    ListService.setProp('osoite', $scope.searchAddress);
                } else {
                    ListService.setProp('osoite', '');
                }
                if ($scope.ui.searchArvotus) {
                    $scope.searchObj['arvotus'] = $scope.ui.searchArvotus;
                    ListService.setProp('arvotus', $scope.ui.searchArvotus);
                } else {
                    ListService.setProp('arvotus', '');
                }
                if ($scope.searchPaikkakunta) {
                    $scope.searchObj['paikkakunta'] = $scope.searchPaikkakunta;
                    ListService.setProp('paikkakunta', $scope.searchPaikkakunta);
                } else {
                    ListService.setProp('paikkakunta', '');
                }

                if ($scope.ui.searchRakennustyyppi) {
                    $scope.searchObj['rakennustyyppi'] = $scope.ui.searchRakennustyyppi;
                    ListService.setProp('rakennustyyppi', $scope.ui.searchRakennustyyppi);
                } else {
                    ListService.setProp('rakennustyyppi', '');
                }

                if ($scope.searchRakennustyypin_kuvaus) {
                    $scope.searchObj['rakennustyypin_kuvaus'] = $scope.searchRakennustyypin_kuvaus;
                    ListService.setProp('rakennustyypin_kuvaus', $scope.searchRakennustyypin_kuvaus);
                } else {
                    ListService.setProp('rakennustyypin_kuvaus', '');
                }
                if ($scope.searchRakennusvuosi_alku) {
                    $scope.searchObj['rakennusvuosi_alku'] = $scope.searchRakennusvuosi_alku;
                    ListService.setProp('rakennusvuosi_alku', $scope.searchRakennusvuosi_alku);
                } else {
                    ListService.setProp('rakennusvuosi_alku', '');
                }
                if ($scope.searchRakennusvuosi_lopetus) {
                    $scope.searchObj['rakennusvuosi_lopetus'] = $scope.searchRakennusvuosi_lopetus;
                    ListService.setProp('rakennusvuosi_lopetus', $scope.searchRakennusvuosi_lopetus);
                } else {
                    ListService.setProp('rakennusvuosi_lopetus', '');
                }
                if ($scope.searchRakennusvuosi_kuvaus) {
                    $scope.searchObj['rakennusvuosi_kuvaus'] = $scope.searchRakennusvuosi_kuvaus;
                    ListService.setProp('rakennusvuosi_kuvaus', $scope.searchRakennusvuosi_kuvaus);
                } else {
                    ListService.setProp('rakennusvuosi_kuvaus', '');
                }
                if ($scope.searchMuutosvuosi_alku) {
                    $scope.searchObj['muutosvuosi_alku'] = $scope.searchMuutosvuosi_alku;
                    ListService.setProp('muutosvuosi_alku', $scope.searchMuutosvuosi_alku);
                } else {
                    ListService.setProp('muutosvuosi_alku', '');
                }
                if ($scope.searchMuutosvuosi_lopetus) {
                    $scope.searchObj['muutosvuosi_lopetus'] = $scope.searchMuutosvuosi_lopetus;
                    ListService.setProp('muutosvuosi_lopetus', $scope.searchMuutosvuosi_lopetus);
                } else {
                    ListService.setProp('muutosvuosi_lopetus', '');
                }
                if ($scope.searchMuutosvuosi_kuvaus) {
                    $scope.searchObj['muutosvuosi_kuvaus'] = $scope.searchMuutosvuosi_kuvaus;
                    ListService.setProp('muutosvuosi_kuvaus', $scope.searchMuutosvuosi_kuvaus);
                } else {
                    ListService.setProp('muutosvuosi_kuvaus', '');
                }
                if ($scope.ui.searchAlkuperainen_kaytto) {
                    $scope.searchObj['alkuperainen_kaytto'] = $scope.ui.searchAlkuperainen_kaytto;
                    ListService.setProp('alkuperainen_kaytto', $scope.ui.searchAlkuperainen_kaytto);
                } else {
                    ListService.setProp('alkuperainen_kaytto', '');
                }
                if ($scope.ui.searchNykykaytto) {
                    $scope.searchObj['nykykaytto'] = $scope.ui.searchNykykaytto;
                    ListService.setProp('nykykaytto', $scope.ui.searchNykykaytto);
                } else {
                    ListService.setProp('nykykaytto', '');
                }
                if ($scope.ui.searchPerustus) {
                    $scope.searchObj['perustus'] = $scope.ui.searchPerustus;
                    ListService.setProp('perustus', $scope.ui.searchPerustus);
                } else {
                    ListService.setProp('perustus', '');
                }
                if ($scope.ui.searchRunko) {
                    $scope.searchObj['runko'] = $scope.ui.searchRunko;
                    ListService.setProp('runko', $scope.ui.searchRunko);
                } else {
                    ListService.setProp('runko', '');
                }
                if ($scope.ui.searchVuoraus) {
                    $scope.searchObj['vuoraus'] = $scope.ui.searchVuoraus;
                    ListService.setProp('vuoraus', $scope.ui.searchVuoraus);
                } else {
                    ListService.setProp('vuoraus', '');
                }
                if ($scope.ui.searchKatto) {
                    $scope.searchObj['katto'] = $scope.ui.searchKatto;
                    ListService.setProp('katto', $scope.ui.searchKatto);
                } else {
                    ListService.setProp('katto', '');
                }
                if ($scope.ui.searchKate) {
                    $scope.searchObj['kate'] = $scope.ui.searchKate;
                    ListService.setProp('kate', $scope.ui.searchKate);
                } else {
                    ListService.setProp('kate', '');
                }
                if ($scope.ui.searchKunto) {
                    $scope.searchObj['kunto'] = $scope.ui.searchKunto;
                    ListService.setProp('kunto', $scope.ui.searchKunto);
                } else {
                    ListService.setProp('kunto', '');
                }
                if ($scope.ui.searchNykytyyli) {
                    $scope.searchObj['nykytyyli'] = $scope.ui.searchNykytyyli;
                    ListService.setProp('nykytyyli', $scope.ui.searchNykytyyli);
                } else {
                    ListService.setProp('nykytyyli', '');
                }
                if ($scope.ui.searchPurettu) {
                    $scope.searchObj['purettu'] = $scope.ui.searchPurettu;
                    ListService.setProp('purettu', $scope.ui.searchPurettu);
                } else {
                    ListService.setProp('purettu', '');
                }
                if ($scope.ui.searchKulttuurihistorialliset_arvot) {
                    $scope.searchObj['kulttuurihistorialliset_arvot'] = $scope.ui.searchKulttuurihistorialliset_arvot;
                    ListService.setProp('kulttuurihistorialliset_arvot', $scope.ui.searchKulttuurihistorialliset_arvot);
                } else {
                    ListService.setProp('kulttuurihistorialliset_arvot', '');
                }
                if ($scope.searchKuvaukset) {
                    $scope.searchObj['kuvaukset'] = $scope.searchKuvaukset;
                    ListService.setProp('kuvaukset', $scope.searchKuvaukset);
                } else {
                    ListService.setProp('kuvaukset', '');
                }

                if ($scope.ui.searchDesigner) {
                    $scope.searchObj['suunnittelija'] = $scope.ui.searchDesigner;
                    ListService.setProp('suunnittelija', $scope.ui.searchDesigner);
                } else {
                    ListService.setProp('suunnittelija', '');
                }

                if ($scope.ui.searchAluetyyppi) {
                    $scope.searchObj['aluetyyppi'] = $scope.ui.searchAluetyyppi;
                    ListService.setProp('aluetyyppi', $scope.ui.searchAluetyyppi);
                } else {
                    ListService.setProp('aluetyyppi', '');
                }

                if ($scope.ui.searchInventointiprojektiId) {
                    $scope.searchObj['inventointiprojektiId'] = $scope.ui.searchInventointiprojektiId;
                    ListService.setProp('inventointiprojektiId', $scope.ui.searchInventointiprojektiId);
                } else {
                    ListService.setProp('inventointiprojektiId', '');
                }

                if ($scope.ui.searchInventoija) {
                    $scope.searchObj['inventoija'] = $scope.ui.searchInventoija;
                    ListService.setProp('inventoija', $scope.ui.searchInventoija);
                } else {
                    ListService.setProp('inventoija', '');
                }

                if ($scope.ui.searchLuoja) {
                    $scope.searchObj['luoja'] = $scope.ui.searchLuoja;
                    ListService.setProp('luoja', $scope.ui.searchLuoja);
                } else {
                    ListService.setProp('luoja', '');
                }

                if ($scope.searchMuinaisjaannostunnus) {
                    $scope.searchObj['muinaisjaannostunnus'] = $scope.searchMuinaisjaannostunnus;
                    ListService.setProp('muinaisjaannostunnus', $scope.searchMuinaisjaannostunnus);
                } else {
                    ListService.setProp('muinaisjaannostunnus', '');
                }

                if ($scope.searchTutkimusNimi) {
                    $scope.searchObj['tutkimuksen_nimi'] = $scope.searchTutkimusNimi;
                    ListService.setProp('tutkimuksen_nimi', $scope.searchTutkimusNimi);
                } else {
                    ListService.setProp('tutkimuksen_nimi', '');
                }

                if ($scope.polygonRajaus != null) {
                    $scope.searchObj["polygonrajaus"] = $scope.polygonRajaus;
                    delete $scope.searchObj['aluerajaus'];
                } else if ($scope.boundsLonLat) {
                    delete $scope.searchObj['polygonrajaus'];
                    $scope.searchObj["aluerajaus"] = "" + $scope.smallerBounds[0] + " " + $scope.smallerBounds[1] + "," + $scope.smallerBounds[2] + " " + $scope.smallerBounds[3];
                    $scope.searchObj['jarjestys'] = 'bbox_center';
                }

                if ($scope.ui.searchKohdeLajit) {
                    $scope.searchObj['kohdelajit'] = $scope.ui.searchKohdeLajit;
                    ListService.setProp('kohdelajit', $scope.ui.searchKohdeLajit);
                } else {
                    ListService.setProp('kohdelajit', '');
                }

                if ($scope.ui.searchKohdeTyypit) {
                    $scope.searchObj['kohdetyypit'] = $scope.ui.searchKohdeTyypit;
                    ListService.setProp('kohdetyypit', $scope.ui.searchKohdeTyypit);
                } else {
                    ListService.setProp('kohdetyypit', '');
                }

                if ($scope.ui.searchKohdeTyyppitarkenteet) {
                    $scope.searchObj['kohdetyyppitarkenteet'] = $scope.ui.searchKohdeTyyppitarkenteet;
                    ListService.setProp('kohdetyyppitarkenteet', $scope.ui.searchKohdeTyypit);
                } else {
                    ListService.setProp('kohdetyyppitarkenteet', '');
                }

                if ($scope.ui.searchKohdeAjoitukset) {
                    $scope.searchObj['ajoitukset'] = $scope.ui.searchKohdeAjoitukset;
                    ListService.setProp('ajoitukset', $scope.ui.searchKohdeAjoitukset);
                } else {
                    ListService.setProp('ajoitukset', '');
                }

                if ($scope.ui.searchTutkimusLajit) {
                    $scope.searchObj['tutkimuslajit'] = $scope.ui.searchTutkimusLajit;
                    ListService.setProp('tutkimuslajit', $scope.ui.searchTutkimusLajit);
                } else {
                    ListService.setProp('tutkimuslajit', '');
                }

                if ($scope.ui.searchKohdeTyhjakohde) {
                    $scope.searchObj['tyhja'] = $scope.ui.searchKohdeTyhjakohde;
                    ListService.setProp('tyhja', $scope.ui.searchKohdeTyhjakohde);
                } else {
                    ListService.setProp('tyhja', 1);
                }

                if ($scope.ui.searchVaatiiTarkastusta) {
                    $scope.searchObj['vaatii_tarkastusta'] = $scope.ui.searchVaatiiTarkastusta;
                    ListService.setProp('vaatii_tarkastusta', $scope.ui.searchVaatiiTarkastusta);
                } else {
                    ListService.setProp('vaatii_tarkastusta', 3);
                }

                if ($scope.ui.searchTutkimusValmis) {
                    $scope.searchObj['tutkimus_valmis'] = $scope.ui.searchTutkimusValmis;
                    ListService.setProp('tutkimus_valmis', $scope.ui.searchTutkimusValmis);
                } else {
                    ListService.setProp('tutkimus_valmis', 3);
                }

                if ($scope.ui.searchTutkimusJulkinen) {
                    $scope.searchObj['tutkimus_julkinen'] = $scope.ui.searchTutkimusJulkinen;
                    ListService.setProp('tutkimus_julkinen', $scope.ui.searchTutkimusJulkinen);
                } else {
                    ListService.setProp('tutkimus_julkinen', 3);
                }

                if ($scope.ui.searchKohdeKyppitilat) {
                    $scope.searchObj['kyppitilat'] = $scope.ui.searchKohdeKyppitilat;
                    ListService.setProp('kyppitilat', $scope.ui.searchKohdeKyppitilat);
                } else {
                    ListService.setProp('kyppitilat', '');
                }

                if($scope.searchTutkimusLyhenne) {
                    $scope.searchObj['tutkimusLyhenne'] = $scope.searchTutkimusLyhenne;
                    ListService.setProp('tutkimusLyhenne', $scope.searchTutkimusLyhenne);
                } else {
                    ListService.setProp('tutkimusLyhenne', '');
                }

                if($scope.searchLoytoPaanumero) {
                    $scope.searchObj['loyto_paanumero'] = $scope.searchLoytoPaanumero;
                    ListService.setProp('loyto_paanumero', $scope.searchLoytoPaanumero);
                } else {
                    ListService.setProp('loyto_paanumero', '');
                }

                if($scope.searchKenttatyoAlkuvuosi) {
                    $scope.searchObj['kenttatyo_alkuvuosi'] = $scope.searchKenttatyoAlkuvuosi;
                    ListService.setProp('kenttatyo_alkuvuosi', $scope.searchKenttatyoAlkuvuosi);
                } else {
                    ListService.setProp('kenttayo_alkuvuosi', '');
                }

                if($scope.searchKenttatyoPaatosvuosi) {
                    $scope.searchObj['kenttatyo_paatosvuosi'] = $scope.searchKenttatyoPaatosvuosi;
                    ListService.setProp('kenttatyo_paatosvuosi', $scope.searchKenttatyoPaatosvuosi);
                } else {
                    ListService.setProp('kenttayo_paatosvuosi', '');
                }

                if($scope.searchKenttatyoJohtaja) {
                    $scope.searchObj['kenttatyojohtaja'] = $scope.searchKenttatyoJohtaja;
                    ListService.setProp('kenttatyojohtaja', $scope.searchKenttatyoJohtaja);
                } else {
                    ListService.setProp('kenttayojohtaja', '');
                }

                MapService.setNeedToCenter(centerTo);

                $scope.selectedLayers = MapService.selectLayer($scope.mapLayers, $scope.selectedLayers, $scope.searchObj, false, $scope.paginators, rebuildPaginators);
            };

            /*
             * Search filter readonly states tracking
             */

            $scope.clearFilters = function () {
                // Kunta
                $scope.ui.searchCounty = "";
                // Kyla
                $scope.ui.searchVillage = "";

                // Kiinteistotunnus, KiinteistoNimi, KiinteistoPalstanumero
                $scope.searchEstateNumber = "";
                $scope.searchEstateName = "";
                $scope.searchEstateColumnNumber = "";

                // Alue
                $scope.searchAreaName = "";
                // Arvoalue
                $scope.searchValueareaName = "";
                // Kohde
                $scope.searchTargetName = "";
                // Osoite
                $scope.searchAddress = "";
                // Arvotus
                $scope.ui.searchArvotus = "";
                // Paikkakunta
                $scope.searchPaikkakunta = "";
                // Kohteen laji
                $scope.ui.searchKohdeLajit = "";
                $scope.ui.searchKohdeTyypit = "";
                $scope.ui.searchKohdeTyyppitarkenteet = "";
                $scope.ui.searchKohdeAjoitukset = "";
                $scope.ui.searchTutkimusLajit = "";
                $scope.ui.searchKohdeTyhjakohde = 1;
                $scope.ui.searchVaatiiTarkastusta = 3;
                $scope.ui.searchTutkimusValmis = 3;
                $scope.ui.searchTutkimusJulkinen = 3;
                $scope.ui.searchKohdeKyppitilat = "";

                // Rakennustyyppi
                $scope.ui.searchRakennustyyppi = "";

                $scope.searchRakennustyypin_kuvaus = "";
                $scope.searchRakennusvuosi_alku = "";
                $scope.searchRakennusvuosi_lopetus = "";
                $scope.searchRakennusvuosi_kuvaus = "";
                $scope.searchMuutosvuosi_alku = "";
                $scope.searchMuutosvuosi_lopetus = "";
                $scope.searchMuutosvuosi_kuvaus = "";
                $scope.searchRakennusvuosi_loppu = "";
                $scope.ui.searchAlkuperainen_kaytto = "";
                $scope.ui.searchNykykaytto = "";
                $scope.ui.searchPerustus = "";
                $scope.ui.searchRunko = "";
                $scope.ui.searchVuoraus = "";
                $scope.ui.searchKatto = "";
                $scope.ui.searchKate = "";
                $scope.ui.searchKunto = "";
                $scope.ui.searchNykytyyli = "";
                $scope.ui.searchPurettu = "";
                $scope.ui.searchKulttuurihistorialliset_arvot = "";
                $scope.searchKuvaukset = "";


                // Aluetyyppi
                $scope.ui.searchAluetyyppi = "";

                // Suunnittelija
                $scope.ui.searchDesigner = "";

                // Inventointiprojekti
                $scope.ui.searchInventointiprojektiId = "";

                $scope.ui.searchInventoija = "";

                //Luoja
                $scope.ui.searchLuoja = ""

                // Muinaisjaannostunnus
                $scope.searchMuinaisjaannostunnus = "";

                // ark tutkimus nimi
                $scope.searchTutkimusNimi = "";
                $scope.searchKenttatyoAlkuvuosi = "";
                $scope.searchKenttatyoPaatosvuosi = "";
                $scope.searchKenttatyoJohtaja = "";
                $scope.searchLoytoPaanumero = "";

            };

            /*
             * Initial states of the search filters
             */
            //$scope.clearFilters();

            angular.extend($scope, MapService.map($scope.mapLayers, undefined, MapService.getUserZoom()));


            // Drawing vector source (to be set later)
            $scope.drawingSource = null;

            // Drawing layer (to be set later)
            $scope.drawingLayer = null;

            // Drawing interaction (to be set later)
            $scope.drawInteraction = null;

            // is the drawing tool active or not? Defaults to not
            $scope.drawingTool = false;

            // function for toggling the above + the interaction
            $scope.toggleDrawingTool = function (value) {
                $timeout(function () {
                    $scope.drawingTool = !$scope.drawingTool;

                    $scope.drawInteraction.setActive($scope.drawingTool);
                });
            };

            if ($scope.drawingTool) {
                $scope.toggleDrawingTool();
            }

            $scope.removePolygonRajaus = function () {
                $scope.polygonRajaus = null;
                var layers = $scope.mainMap.getLayers();
                for (var i = 0; i < layers.array_.length; i++) {
                    var mapLayer = layers.array_[i];

                    // it's this one
                    if (mapLayer.values_.name == 'DrawingLayer') {
                        // clear the layer
                        var source = mapLayer.getSource();
                        source.clear();
                    }
                }
                ListService.setProp('polygonrajaus', '');
                $scope.search(undefined, undefined, false);
            };

            //Käyttäjän piirtämä geometria jonka avulla hakutuloksia rajataan (jos piirretty)
            $scope.polygonRajaus = null;

            // olData.getMap() will return a different map after a modal
            // with a map is opened;
            // therefore, we must store the original
            $scope.mainMap = null;

            olData.getMap("mapPageMainMap").then(function (map) {
                $scope.mainMap = map;
                // USERLOCATION LAYER
                /*
                    Initialize the user location layer - the layer that shows the users location points
                */
                $scope.userLocationSource = new ol.source.Vector({useSpatialIndex: false});
                // Point style
                var img = new ol.style.Circle({
                    radius : 2,
                    stroke : new ol.style.Stroke({
                        color : 'black',
                        width : 1
                    }),
                    fill : new ol.style.Fill({
                        color : 'red'
                    })
                });
                var pointStyle = new ol.style.Style({image: img});

                // Line style
                var style = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'red',
                        width: 1
                    })
                });
                // Set up the layer
                $scope.userLocationLayer = new ol.layer.Vector({
                    source: $scope.userLocationSource,
                    style: [style, pointStyle],
                    name: "UserLocationLayer"
                });
                // Add the layer to the mainMap layers
                $scope.userLocationLayer.setZIndex(998);
                $scope.mainMap.addLayer($scope.userLocationLayer);

                /*
                    KÄYTTÄJÄN SIJAINNIN SEURANTA, KÄYNNISTETÄÄN UUDELLEEN JOS SE OLI PÄÄLLÄ ENNEN NÄKYMÄÄN TULOA

                    Rekisteröidään sivulle tultaessa kartan keskipiste käyttäjän seurantaan, jos seuranta on päällä
                    ja samalla piirretään servicellä olevat pisteet + viivat.
                    Joudutaan lopettamaan ja aloittamaan seuranta uudelleen, koska muutoin pisteet ja viivat eivät jostain syystä enää piirry
                    Tästä ei kuitenkaan sinänsä ole haittaa, koska aiempaa reittiä ei menetetä.

                    Jos tallennus ei ole päällä, mutta käyttäjällä on tallentamattomia reittejä, piirretään nämä kartalle.
                */
                if($scope.locationService.getWatchId()) {
                  $scope.locationService.registerCenter($scope.center);
                  $scope.stopWatch();
                  $scope.watchPosition();
                  $scope.locationService.drawUnsavedLocations($scope.userLocationLayer);
                } else if($scope.locationService.getUnsavedLocations().length > 0) {
                    $scope.locationService.drawUnsavedLocations($scope.userLocationLayer);
                }



                /* Initialize drawing vector source */
                $scope.drawingSource = new ol.source.Vector({useSpatialIndex: false});
                /* Initialize drawing layer */
                $scope.drawingLayer = new ol.layer.Vector({
                    source: $scope.drawingSource,
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            width: 2
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(240, 240, 240, 0.5)'
                        })
                    }),
                    name: "DrawingLayer"
                });
                $scope.drawingLayer.setZIndex(98);
                $scope.mainMap.addLayer($scope.drawingLayer);

                /* Initialize the drawing interaction */
                $scope.drawInteraction = new ol.interaction.Draw({
                    source: $scope.drawingSource,
                    type: 'Polygon'
                });

                // default the draw interaction to inactive
                $scope.drawInteraction.setActive(false);
                $scope.mainMap.addInteraction($scope.drawInteraction);

                // stop drawing after a feature is finished
                $scope.drawingSource.on('addfeature', function (event) {
                    $timeout(function () {
                        $scope.search(undefined, undefined, false);
                    });
                });


                $scope.drawInteraction.on('drawstart', function (event) {
                    // unused atm
                }, this);

                $scope.drawInteraction.on('drawend', function (event) {
                    // find the correct layer to append the newly drawn
                    // feature to
                    var layers = $scope.mainMap.getLayers();
                    for (var i = 0; i < layers.array_.length; i++) {
                        var mapLayer = layers.array_[i];

                        // it's this one
                        if (mapLayer.values_.name == 'DrawingLayer') {
                            // clear the layer
                            var source = mapLayer.getSource();
                            source.clear();

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
                                type: "Polygon",
                                coordinates: [
                                    featureCoordArray
                                ]
                            };

                            // create the feature for the map layer
                            var feature = {
                                type: "Feature",
                                geometry: geometry,
                                properties: { name: "Test", id: 1 }
                            };


                            $scope.polygonRajaus = propsCoords;

                            break;
                        }
                    }

                    $scope.toggleDrawingTool();

                    $scope.$apply();
                });


                /*
                 * TODO: Siisti
                 */
                if (ListService.getProp('polygonrajaus')) {

                    // find the correct layer to append the newly drawn
                    // feature to
                    var layers = $scope.mainMap.getLayers();
                    for (var i = 0; i < layers.array_.length; i++) {
                        var mapLayer = layers.array_[i];

                        // it's this one
                        if (mapLayer.values_.name == 'DrawingLayer') {
                            // clear the layer
                            var source = mapLayer.getSource();
                            source.clear();

                            // featureCoordArray will have the
                            // coordinates in GeoJSON format,
                            // propsCoords will have them in a "flat"
                            // string
                            var featureCoordArray = [], propsCoords = "";

                            // get the coordinates of the new feature,
                            // convert and store them
                            var coords = ListService.getProp('polygonrajaus');
                            coords = coords.split(',');
                            for (var i = 0; i < coords.length; i++) {
                                coords[i] = coords[i].split(" ");
                            }

                            for (var i = 0; i < coords.length; i++) {

                                var lonlat = MapService.epsg4326ToEpsg3067(coords[i][0], coords[i][1]);
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
                            /*
                                                                // create the feature for the map layer
                                                                var feature = {
                                                                    type : "Feature",
                                                                    geometry : geometry,
                                                                    properties: {name: "Test", id: 1}
                                                                };
                              */

                            $scope.polygonRajaus = ListService.getProp('polygonrajaus');

                            var g = new ol.geom.Polygon([featureCoordArray]);
                            var f = new ol.Feature({
                                name: 'thng',
                                geometry: g
                            });
                            source.addFeature(f);

                            //Set the feature coordinates to as the center of the map
                            var cent = MapService.approximatePolygonCenter(geometry);
                            MapService.setCenterToObject({
                                type: 'polygonrajaus',
                                value: geometry
                            });
                            /*
                            $timeout(function() {
                                $scope.center.lon = cent[0];
                                $scope.center.lat = cent[1];
                            }, 1000);
                            */
                            break;
                        }
                    }
                } else if (ListService.getProp('aluerajaus')) {

                    MapService.setCenterToObject({
                        type: 'aluerajaus',
                        value: ListService.getProp('aluerajaus')
                    });
                    /*
                    $timeout(function() {
                        MapService.centerToExtent($scope.mainMap, ListService.getProp('aluerajaus'));

                        ListService.setProp('aluerajaus', '');
                    }, 1000);
                    */
                }

            });

            $scope.createKiinteistoTool = false;
            $scope.createKohdeTool = false;

            $scope.toggleCreateKiinteistoTool = function () {
                $timeout(function () {
                    $scope.createKiinteistoTool = !$scope.createKiinteistoTool;
                    // TODO: Cancel out the createRakennusTool etc.
                });
            }
            $scope.toggleCreateKohdeTool = function () {
                $timeout(function () {
                    $scope.createKohdeTool = !$scope.createKohdeTool;
                    // TODO: Cancel out the createRakennusTool etc.
                });
            }

            $scope.$on('openlayers.map.pointermove', function (event, data) {
                $scope.$apply(function () {
                    if ($scope.mainMap) {
                        var map = $scope.mainMap;

                        if ($scope.createKiinteistoTool) {
                            map.getTarget().style.cursor = 'pointer';
                        } else if ($scope.createKohdeTool) {
                            map.getTarget().style.cursor = 'pointer';
                        } else if ($scope.queryLayer != null) {
                            map.getTarget().style.cursor = 'help';
                        } else {
                            var pixel = map.getEventPixel(data.event.originalEvent);

                            var layerHit = null;
                            var featureHit = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                                layerHit = layer;
                                map.getTarget().style.cursor = 'pointer';
                                return feature;
                            });

                            if (typeof featureHit === 'undefined') {
                                MapService.hideMapPopup("mapPopup");
                                map.getTarget().style.cursor = 'move';
                                return;
                            } else {
                                MapService.showMapPopup("mapPopup", data, featureHit, layerHit, false);
                            }
                        }
                    }
                });
            });

            /*
             * Watch zoom level changes and save the zoom to the MapService.
             */
            $scope.$watch('center.zoom', function (zoom) {
                MapService.setUserZoom(zoom);
            });

            $scope.queryLayer = null;
            $scope.selectQueryLayer = function (queryLayer) {
                if ($scope.queryLayer == queryLayer) {
                    $scope.queryLayer = null;
                } else {
                    $scope.queryLayer = queryLayer;
                }
            };

            //Tarkastetaan voiko tasolta kysyä featureInfoa.
            $scope.showInQueryLayerList = function (layer) {
                var layers = $scope.mainMap.getLayers();

                for (var j = 0; j < layers.array_.length; j++) {
                    if (layers.array_[j].values_.name == layer.name) {
                        var layer = layers.array_[j];
                        var source = layer.getSource();
                        if (source.__proto__.hasOwnProperty('getGetFeatureInfoUrl')) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                }
            };

            // Mennään koko näytön tilaan (ei käytössä, eikä varmaan tarvitakkaan, koska OL sisältää napin tähän käyttöön)
            $scope.setMapToFullScreen = function(){
                //if your map element id is other than 'map' change it here
                var elem = document.getElementById('mapPageMainMap');
                if (elem.requestFullscreen) {
                    elem.requestFullscreen();
                } else if (elem.msRequestFullscreen) {
                    elem.msRequestFullscreen();
                } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                } else if (elem.webkitRequestFullscreen) {
                   elem.webkitRequestFullscreen();
                }
            }

            // Poistutaan koko näytön tilasta. Tällä hetkellä ei käytössä,
            // mutta voisiko olla hyvä esim jos featurea painetaan koko näytön tilassa?
            // Muutoin avattavat näkymät jäävät kokonäytön tilan "alle"
            // Onko myöskään tarvetta omalle funkkarille vai kutsuakko suoraan document.exitFullscreen()..
            // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen
            $scope.exitFullScreen = function() {
                // Jos ei olla full screen modessa, antaa selain virheen.
                if (!navigator.platform.match(/iPad/i)){
                    document.exitFullscreen().then(/* ollaan valmiita */).catch(function e(error) {
                        //console.log(error);
                        // Ei oltu full screenissä. TODO: Tee toggle ja ota arvo talteen ollaanko fullscreeniin menty.
                    });
                }
            }

            $scope.$on('openlayers.map.singleclick', function (event, data) {
                $scope.$apply(function () {
                    if ($scope.mainMap) {
                        if ($scope.createKiinteistoTool) {
                            ModalService.kiinteistoModal(null, MapService.epsg3067ToEpsg4326(data.event.coordinate[0], data.event.coordinate[1]));
                            $scope.toggleCreateKiinteistoTool();
                        } else if ($scope.createKohdeTool) {
                            ModalService.kohdeModal(null, MapService.epsg3067ToEpsg4326(data.event.coordinate[0], data.event.coordinate[1]));
                            $scope.toggleCreateKohdeTool();
                        } else if ($scope.queryLayer != null) {
                            $scope.getFeatureInfo(data);
                        } else if (!$scope.drawingTool) {
                            var map = $scope.mainMap;
                            var pixel = map.getEventPixel(data.event.originalEvent);

                            var layerHit = null;
                            var featureHit = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                                layerHit = layer;
                                return feature;
                            });

                            if (typeof featureHit !== 'undefined') {
                                $scope.exitFullScreen();
                                //Prepare the found items for the EntityBrowserService
                                var features = layerHit.getSource().getFeatures();//Get the features on the current layer

                                var items = { 'features': [] };
                                for (var i = 0; i < features.length; i++) { //Fix the structure of the feature
                                    var item = {
                                        'properties': features[i].getProperties()
                                    };

                                    items.features.push(item); //Push the fixed entity to the list
                                }

                                if (layerHit.getProperties().name == 'Kiinteistot') {
                                    KiinteistoService.fetchKiinteisto(featureHit.getProperties().id).then(function (kiinteisto) {
                                        var amount = $scope.kiinteistoPages[0].rivi * $scope.kiinteistoPages.length;
                                        EntityBrowserService.setQuery('kiinteisto', kiinteisto.properties.id, { 'mainmap': true }, items.features.length, items);
                                        ModalService.kiinteistoModal(kiinteisto, null);
                                    });
                                } else if (layerHit.getProperties().name == 'Rakennukset') {
                                    RakennusService.fetchRakennus(featureHit.getProperties().id).then(function (rakennus) {
                                        EntityBrowserService.setQuery('rakennus', rakennus.properties.id, { 'mainmap': true }, items.features.length, items);
                                        ModalService.rakennusModal(true, rakennus, null, null);
                                    });
                                } else if (layerHit.getProperties().name == 'Alueet') {
                                    AlueService.fetchAlue(featureHit.getProperties().id).then(function (alue) {
                                        EntityBrowserService.setQuery('alue', alue.properties.id, { 'mainmap': true }, items.features.length, items);
                                        ModalService.alueModal(true, alue);
                                    });
                                } else if (layerHit.getProperties().name == 'Arvoalueet') {
                                    ArvoalueService.fetchArvoalue(featureHit.getProperties().id).then(function (arvoalue) {
                                        EntityBrowserService.setQuery('arvoalue', arvoalue.properties.id, { 'mainmap': true }, items.features.length, items);
                                        ModalService.arvoalueModal(true, arvoalue);
                                    });
                                } else if(layerHit.getProperties().name == 'Kohteet') {
                                    KohdeService.fetchKohde(featureHit.getProperties().id).then(function (kohde) {
                                        // Siivotaan items-listasta pois duplikaatit (kohteella voi olla n kappaletta sijainteja)
                                        // Jos ei siivota, niin entityBrowser "jää jumiin" duplikaattiin vaihdettaessa entiteettiä
                                        var uniqueItems = { features: [] };
                                        for(var i = 0; i < items.features.length; i++) {
                                            var indexOfItem = -1;
                                            for(var j = 0; j < uniqueItems.features.length; j++) {
                                                if(uniqueItems.features[j].properties.id === items.features[i].properties.id) {
                                                    indexOfItem = j;
                                                    break;
                                                }
                                            }
                                            if(indexOfItem == -1) {
                                                uniqueItems.features.push(items.features[i]);
                                            }
                                        }
                                        EntityBrowserService.setQuery('kohde', kohde.properties.id, {'mainmap': true}, uniqueItems.features.length, uniqueItems);
                                        ModalService.kohdeModal(kohde);
                                    })
                                } else if (layerHit.getProperties().name == 'Tutkimusalueet') {
                                    TutkimusService.haeTutkimus(featureHit.getProperties().ark_tutkimus_id).then(function (tutkimus) {
                                        EntityBrowserService.setQuery('tutkimus', tutkimus.properties.id, { 'mainmap': true }, items.features.length, items);
                                        ModalService.tutkimusModal(true, tutkimus, null);
                                    })
                                }
                            }
                        }
                    }
                });
            });

            //Generic, info format text/html.
            $scope.getFeatureInfo = function (data) {
                var layer = null;
                var source = null;
                var layers = $scope.mainMap.getLayers();
                var viewResolution = $scope.mainMap.values_.view.getResolution();

                for (var i = 0; i < layers.array_.length; i++) {
                    if (layers.array_[i].values_.name == $scope.queryLayer.name) {

                        layer = layers.array_[i];
                        source = layer.getSource();

                        if (source.__proto__.hasOwnProperty('getGetFeatureInfoUrl')) {
                            var url = source.getGetFeatureInfoUrl(data.coord, viewResolution, 'EPSG:3067', {
                                'INFO_FORMAT': 'text/html',
                                'REQUEST': 'GetFeatureInfo',
                                'FEATURE_COUNT': 20
                            });

                            var U = new URL(url);
                            var host = U.host;
                            MapService.getFeatureInfo(url).then(function (data) {
                                ModalService.featureInfoModal(data, host);
                            }, function (response) {
                                console.log("Error: " + response);
                            });
                        }
                    }
                }
            };



            // keep track of the map's bounds
            $scope.$watch("offset", function (offset) {
                $scope.center.bounds[0] += parseFloat(offset, 10);
                $scope.center.bounds[1] += parseFloat(offset, 10);
                $scope.center.bounds[2] -= parseFloat(offset, 10);
                $scope.center.bounds[3] -= parseFloat(offset, 10);
            });

            $scope.boundsLonLat = [];
            $scope.smallerBounds = [];

            // map's bounds in EPSG:4326 coordinates; do feature search
            // when these change (when the map center is moved or the
            // zoom level changes)
            $scope.$watch("center.bounds", function (newValue, oldValue) {
                if (newValue) {
                    if (!isNaN(newValue[0])) {
                        $scope.boundsLonLat[0] = MapService.epsg3067ToEpsg4326($scope.center.bounds[0], $scope.center.bounds[1])[0];
                        $scope.boundsLonLat[1] = MapService.epsg3067ToEpsg4326($scope.center.bounds[0], $scope.center.bounds[1])[1];
                        $scope.boundsLonLat[2] = MapService.epsg3067ToEpsg4326($scope.center.bounds[2], $scope.center.bounds[3])[0];
                        $scope.boundsLonLat[3] = MapService.epsg3067ToEpsg4326($scope.center.bounds[2], $scope.center.bounds[3])[1];

                        // approximate the area that is actually shown to
                        // the user; the map's bounds are larger than the
                        // viewport
                        $scope.smallerBounds[0] = $scope.boundsLonLat[0] + (1.005 * ($scope.boundsLonLat[2] - $scope.boundsLonLat[0]));
                        $scope.smallerBounds[1] = $scope.boundsLonLat[1] + (0.20 * ($scope.boundsLonLat[3] - $scope.boundsLonLat[1]));
                        $scope.smallerBounds[2] = $scope.boundsLonLat[2] - (1.005 * ($scope.boundsLonLat[2] - $scope.boundsLonLat[0]));
                        $scope.smallerBounds[3] = $scope.boundsLonLat[3] - (0.20 * ($scope.boundsLonLat[3] - $scope.boundsLonLat[1]));

                        $timeout(function () {
                            $scope.search(true, null, false);
                        });
                    }
                }

            });

            /*
             * OSOITE JA NIMISTÖHAKU
             */

            /*
             * Search and geolocate addresses and places
             */
            $scope.addresses = []; // Holder for the addresses we geolocate
            $scope.nimistot = []; // Holder for the places we geolocate

            /*
             * Perform search based on the given address
             */
            $scope.geolocate = function (addr) {
                MapService.getOsoiteDetails(addr).then(function success(data) {
                    $scope.addresses = data.data.features;
                }, function error(data) {
                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                });
            };

            /*
             * Perform search based on the given place name
             */
            $scope.geolocateNimisto = function (nimi) {
                MapService.getNimistoDetails(nimi).then(function success(data) {
                    $scope.nimistot = data.data.features;
                }, function error(data) {
                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                });
            };

            /*
             * Move the map upon selecting an option
             */
            $scope.$on('$typeahead.select', function (event, value, index, elem) {
                /*
                 * console.log(event); // event properties console.log(value); // value of select console.log(index); // index of selected value in dropdown console.log(elem); // properties of calling element ($id to get the id) console.log($scope.addresses);
                 */
                var coord = value.geometry.coordinates;

                $scope.center.lon = coord[0];
                $scope.center.lat = coord[1];

                $scope.showMarker($scope.center.lon, $scope.center.lat, value);

            });

            //Remove existing marker(s)
            $scope.clearMarker = function () {
                $scope.markers.length = 0;
            };

            // Marker custom style
            $scope.custom_style = {
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
            $scope.showMarker = function (lon, lat, obj) {
                //Clear old marker(s)
                $scope.clearMarker();

                //Convert the coordinates to 4326 projection
                var epsg4326Coords = MapService.epsg3067ToEpsg4326(lon, lat);

                var label = "";
                if(obj) {
                    if (obj.properties.osoite !== undefined) {
                        label = obj.properties.osoite;
                    } else if (obj.properties.formatted_data !== undefined) {
                        label = obj.properties.formatted_data;
                    }
                }

                // Add marker to the position
                $scope.markers.push({
                    label: label,
                    lon: epsg4326Coords[0],
                    lat: epsg4326Coords[1]
                });

                // Markerin näyttäminen timeoutin sisällä, koska muutoin marker jää välillä muiden karttatasojen alle.
                $timeout(function() {
                    var layers = $scope.mainMap.getLayers();
                    for (var i = 0; i < layers.array_.length; i++) {
                        var mapLayer = layers.array_[i];


                        if (mapLayer.values_.name == undefined && mapLayer.values_.markers === true) {
                            mapLayer.setZIndex(1000);
                            break;
                        }
                    }
                    $scope.$apply();
                }, 1000);
            };

            // Center the user to the position and draw a feature there on the userLocationLayer
            $scope.centeredToUser = false;
            $scope.getCurrentPosition = function() {
                $scope.markers.length = 0;
                $scope.locationService.getCurrentPosition().then(function(coords) {
                    $scope.center.lon = coords[0];
                    $scope.center.lat = coords[1];
                    $scope.centeredToUser = true;
                    $scope.showMarker($scope.center.lon, $scope.center.lat);
                });
            };

            $scope.locationTreshold = $scope.locationService.getLocationTreshold();
            $scope.setLocationTreshold = function(val) {
                $scope.locationTreshold = val;
                $scope.locationService.setLocationTreshold(val);
            }

            // Aloita käyttäjän sijainnin jäljen tallennus
            $scope.watchPosition = function() {
                // Poistetaan mahdollinen sijaintimarker
                $scope.clearMarker();

                // Tyhjennetään mahdolliset entiteettilinkkausvalinnat
                $scope.ui.linkToEntityType = '';
                $scope.ui.linkToEntityId = null;

                //$scope.locationService.registerCenter($scope.center);
                $scope.locationService.watchPosition($scope.center, $scope.userLocationLayer);
            };

            // Lopetetaan sijainnin tallennus
            $scope.stopWatch = function() {
                $scope.locationService.stopWatch();
            };

            // Poistetaan tallennetut reittipisteet
            // Lisäksi tyhjätään mahdolliset kesken jääneet linkkaukset
            $scope.clearUnsavedLocations = function() {
                $scope.locationService.removeLocationPoints($scope.userLocationLayer);
                $scope.ui.linkToEntityType = '';
                $scope.ui.linkToEntityId = null;
            };

            // Get layer from the mainMap based on it's name
            $scope.getLayerByName = function(layerName) {
                var layers = $scope.mainMap.getLayers();
                for(var i = 0; i< layers.array_.length; i++) {
                    if(layers.array_[i].values_.name === layerName) {
                        return layers.array_[i];
                    }
                }
                return null;
            }

            /*
             * OSOITE JA NIMISTÖHAKU END
             */

            $rootScope.$on('Map_totalcount_updated', function (event, data) {
                if (data.type == 'Kiinteistot') {
                    $scope.kiinteistoTotal = data.count;
                } else if (data.type == 'Rakennukset') {
                    $scope.rakennusTotal = data.count;
                } else if (data.type == 'Alueet') {
                    $scope.alueTotal = data.count;
                } else if (data.type == 'Arvoalueet') {
                    $scope.arvoalueTotal = data.count;
                } else if (data.type == 'Kohteet') {
                    $scope.kohdeTotal = data.count;
                } else if (data.type == 'Tutkimusalueet') {
                    $scope.tutkimusTotal = data.count;
                }
            });

            // Keskitä kartta annettuihin koordinaatteihin, jos
            // missään kartan tasoista ei ole yhtään hakutuloksia näytettävänä
            // Keskitetään ainoastaan jos hakuehtoja on annettu.
            $rootScope.$on('Center_map_to', function (event, data) {
                // Jos halutaan että zoomia muutetaan automaattisesti
                // $scope.center.zoom = 12;


                //Kommentoitu pois koodi jossa keskitetään ensisijaisesti pelkästään yhteen ainoaan pisteeseen (1. jolla on koordinaatit)
                //ja otettu käyttöön keskitys siten, että kaikki haun palauttamat pisteet mahtuvat kartalle.
                /*
                                        // Convert the coordinates to the correct projection
                                        if(data.coordinates !== null && data.coordinates[0] && data.coordinates[1]) {
                                        var prj = ol.proj.transform([
                                                data.coordinates[0], data.coordinates[1]
                                        ], 'EPSG:4326', 'EPSG:3067').map(function(c) {
                                            return c.toFixed(4);
                                        });

                                        var lon = parseFloat(prj[0]);
                                        var lat = parseFloat(prj[1]);

                                        $scope.center.lon = lon;
                                        $scope.center.lat = lat;

                                        } else if(data.extent) {
                                            MapService.centerToExtent($scope.mainMap, data.extent);
                                        }

                                        */
                if (data.extent) {
                    MapService.centerToExtent($scope.mainMap, data.extent);
                } else if (data.coordinates) {
                    $scope.center.lon = data.coordinates[0];
                    $scope.center.lat = data.coordinates[1];
                }
            });

            // For map debugging...
            if (CONFIG.DEBUG) {
                // debug: output the map
                hotkeys.bindTo($scope).add({
                    combo: 'd',
                    description: 'Map debug',
                    callback: function () {
                        console.log("MapService.map():");
                        console.log(MapService.map());
                        console.log("Scope.mainMap");
                        console.log($scope.mainMap);
                        console.log("Scope.mainMap.getLayers()");
                        console.log($scope.mainMap.getLayers());
                    }
                });
            }

            /*
             * Clear the save search properties from the service and reapply the cleared filters.
             */
            $scope.clearSearchFilter = function () {
                ListService.clearProps();
                $scope.ui.searchCounty = "";
                $scope.ui.searchVillage = "";
                $scope.searchEstateNumber = "";
                $scope.searchEstateColumnNumber = "";
                $scope.searchEstateName = "";
                $scope.searchAreaName = "";
                $scope.searchValueareaName = "";
                $scope.searchTargetName = "";
                $scope.searchAddress = "";
                $scope.ui.searchArvotus = "";
                $scope.ui.searchKohdeLajit = "";
                $scope.ui.searchKohdeTyypit = "";
                $scope.ui.searchKohdeTyyppitarkenteet = "";
                $scope.ui.searchKohdeAjoitukset = "";
                $scope.ui.searchTutkimusLajit = "";
                $scope.ui.searchKohdeTyhjakohde = 1; // Default value
                $scope.ui.searchVaatiiTarkastusta = 3; // Default value
                $scope.ui.searchTutkimusValmis = 3; // Default value
                $scope.ui.searchTutkimusJulkinen = 3; // Default value
                $scope.ui.searchKohdeKyppitilat = "";
                $scope.searchPaikkakunta = "";
                $scope.ui.searchRakennustyyppi = "";
                $scope.searchRakennustyypin_kuvaus = "";
                $scope.searchRakennusvuosi_alku = "";
                $scope.searchRakennusvuosi_lopetus = "";
                $scope.searchRakennusvuosi_kuvaus = "";
                $scope.searchMuutosvuosi_alku = "";
                $scope.searchMuutosvuosi_lopetus = "";
                $scope.searchMuutosvuosi_kuvaus = "";
                $scope.ui.searchAlkuperainen_kaytto = "";
                $scope.ui.searchNykykaytto = "";
                $scope.ui.searchPerustus = "";
                $scope.ui.searchRunko = "";
                $scope.ui.searchVuoraus = "";
                $scope.ui.searchKatto = "";
                $scope.ui.searchKate = "";
                $scope.ui.searchKunto = "";
                $scope.ui.searchNykytyyli = "";
                $scope.ui.searchPurettu = "";
                $scope.ui.searchKulttuurihistorialliset_arvot = "";
                $scope.searchKuvaukset = "";
                $scope.searchMuinaisjaannostunnus = "";
                $scope.searchTutkimusNimi = "";
                $scope.searchTutkimusLyhenne = "";
                $scope.searchKenttatyoAlkuvuosi = "";
                $scope.searchKenttatyoPaatosvuosi = "";
                $scope.searchKenttatyoJohtaja = "";
                $scope.searchLoytoPaanumero = "";


                $scope.ui.searchDesigner = "";
                $scope.ui.searchAluetyyppi = "";
                $scope.ui.searchInventointiprojektiId = "";
                $scope.ui.searchInventoija = "";
                $scope.ui.searchLuoja = "";

                $scope.removePolygonRajaus();
                $scope.getSearchValues();
                $scope.search(true, null, false);
            };

            /*
             * Save the geometry filter and change to the active list page automatically.
             */
            $scope.showResultsOnListPage = function () {
                if ($scope.polygonRajaus) {
                    ListService.setProp('polygonrajaus', $scope.polygonRajaus);
                } else {
                    ListService.setProp('aluerajaus', $scope.searchObj["aluerajaus"]);
                }

                for (var i = 0; i < $scope.tabs.length; i++) {
                    if ($scope.tabs[i].title === locale.getString('common.Building_inventory')) {
                        $scope.navigate({ tab: { title: locale.getString('common.Building_inventory'), href: $scope.tabs[i].href } });
                        break;
                    }
                }
            };

            // Tyyppi johon käyttäjän reitti linkitetään
            $scope.ui.linkToEntityType = '';
            // Entiteetin ID johon reitti linkitetään
            $scope.ui.linkToEntityId = null;
            // Linkitettävät entiteettityypit
            $scope.entityTypeOptions = [
                {'type': "Kohde", 'label': locale.getString('ark.Target')},
                {'type': 'Inventointitutkimus', 'label': locale.getString('research.Inventory_research')},
                {'type': 'Tarkastustutkimus', 'label': locale.getString('research.Inspection_research')},
                {'type': 'Rakennus', 'label': locale.getString('common.Building')},
                {'type': "Arvoalue", 'label': locale.getString('common.Valuearea')}];

            // Kun tyyppi valitaan
            $scope.entityTypeOnSelect = function() {
                $scope.ui.linkToEntityId = null;
            };

            // Lista, joka sisältää haettuja entiteettejä linkkausta varten
            $scope.entitiesToLink = [];
            // Haetaan linkkauksen kohde tyypin käyttäjän hakuehtojen mukaan
            $scope.getEntitiesToLink = function(search) {
                console.log("type: " + $scope.ui.linkToEntityType);
                $scope.entitiesToLink = [];

                if($scope.ui.linkToEntityType === 'Kohde') {
                    var kohdeSearchObj = {'rivit': 10, 'jarjestys': 'nimi'};
                    if(search) {
                        kohdeSearchObj['nimi'] = search;
                    }
                    KohdeService.getKohteet(kohdeSearchObj).then(function(data) {
                        // Otetaan propertyt välistä pois, sekoittavat ui-selectin
                        for (var i = 0; i < data.features.length; i++) {
                            $scope.entitiesToLink.push(data.features[i].properties);
                        }
                    });
                } else if($scope.ui.linkToEntityType === 'Inventointitutkimus') {
                    var itSearchObj = {'rivit': 10, 'jarjestys': 'nimi', 'tutkimuslajit': 5};
                    if(search) {
                        itSearchObj['nimi'] = search;
                    }
                    TutkimusService.haeTutkimukset(itSearchObj).then(function(data) {
                        for (var i = 0; i < data.features.length; i++) {
                            $scope.entitiesToLink.push(data.features[i].properties);
                        }
                    });
                } else if($scope.ui.linkToEntityType === 'Tarkastustutkimus') {
                    var ttSearchObj = {'rivit': 10, 'jarjestys': 'nimi', 'tutkimuslajit': 11};
                    if(search) {
                        ttSearchObj['nimi'] = search;
                    }
                    TutkimusService.haeTutkimukset(ttSearchObj).then(function(data) {
                        for (var i = 0; i < data.features.length; i++) {
                            $scope.entitiesToLink.push(data.features[i].properties);
                        }
                    });
                } else if($scope.ui.linkToEntityType === 'Rakennus') {
                    var rakennusSearchObj = {'rivit': 10, 'jarjestys': 'kiinteistotunnus'};
                    if(search) {
                        rakennusSearchObj['kiinteistotunnus'] = search;
                    }
                    RakennusService.getRakennukset(rakennusSearchObj).then(function(data) {
                        for (var i = 0; i < data.features.length; i++) {
                            $scope.entitiesToLink.push(data.features[i].properties);
                        }
                    });
                }  else if($scope.ui.linkToEntityType === 'Arvoalue') {
                    var aaSearchObj = {'rivit': 10, 'jarjestys': 'nimi'};
                    if(search) {
                        aaSearchObj['nimi'] = search;
                    }
                    ArvoalueService.getArvoalueet(aaSearchObj).then(function(data) {
                        for (var i = 0; i < data.features.length; i++) {
                            $scope.entitiesToLink.push(data.features[i].properties);
                        }
                    });
                }
            };

            // Linkitetään käyttäjän reitti valittuun tyyppiin ja entiteettiin
            $scope.linkToEntity = function() {
                console.log("Linking route to " + $scope.ui.linkToEntityType + "/" + $scope.ui.linkToEntityId);

                $scope.locationService.saveEntityLink({'entiteetti_tyyppi': $scope.ui.linkToEntityType, 'entiteetti_id': $scope.ui.linkToEntityId, 'pisteet': $scope.locationService.getUnsavedLocations()}).then(function success(data) {
                    console.log("Linked successfully!"); // TODO: Näytä tieto käyttäjälle
                    locale.ready('common').then(function(data) {
                        AlertService.showInfo(locale.getString('common.Save_ok'));
                    });
                    //Tyhjennetään taso
                    $scope.locationService.clearLayer($scope.userLocationLayer);
                }, function error(data) {
                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                });

                $scope.ui.linkToEntityType = '';
                $scope.ui.linkToEntityId = null;
            };

            /*
             * Valintalistojen arvot
             */
            /*
             * Arvotus
             */
            $scope.arvotusOptions = [];
            $scope.getArvotusOptions = function () {
                ListService.getOptions('arvotus').then(function success(options) {
                    $scope.arvotusOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_valuation_options_failed"), AlertService.message(data));
                    });
                });
            };
            $scope.getArvotusOptions();

            $scope.kuntaOptions = [];
            $scope.getKunnat = function (search) {
                $scope.kuntaOptions.length = 0;
                var s = {
                    'rivit': 100,
                    'jarjestys': 'nimi',
                };
                if (search) {
                    if (isNaN(search)) {
                        s['nimi'] = search;
                    } else {
                        s['kuntanumero'] = search;
                    }
                }

                KuntaService.getKunnat(s).then(function success(kunnat) {
                    for (var i = 0; i < kunnat.features.length; i++) {
                        $scope.kuntaOptions.push(kunnat.features[i].properties);
                    }
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_counties_failed"), AlertService.message(data));
                    })
                });
            };

            $scope.setKunta = function (kunta, model, nollaaKyla) {
                if (kunta) {
                    $scope.ui.searchCounty = kunta.id;
                }
                if (nollaaKyla === true) {
                    $scope.ui.searchVillage = null;
                }

                $scope.getKylat();
            };

            $scope.kylaOptions = [];
            $scope.getKylat = function (search) {
                $scope.kylaOptions.length = 0;
                var s = {
                    'rivit': 200,
                    'jarjestys': 'nimi',
                };
                if (search) {
                    if (isNaN(search)) {
                        s['nimi'] = search;
                    } else {
                        s['kylanumero'] = search;
                    }
                }

                //Jos hakuehdoissa on kunta asetettuna, haetaan kyseisen kunnan kylät, muutoin haetaan yleisesti kyliä
                if ($scope.ui.searchCounty) {
                    KuntaService.getKylatOfKunta($scope.ui.searchCounty, s).then(function success(kylat) {
                        for (var i = 0; i < kylat.features.length; i++) {
                            $scope.kylaOptions.push(kylat.features[i].properties);
                        }
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_villages_failed"), AlertService.message(data));
                        })
                    });
                } else {
                    KylaService.getKylat(s).then(function success(kylat) {
                        for (var i = 0; i < kylat.features.length; i++) {
                            $scope.kylaOptions.push(kylat.features[i].properties);
                        }
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_villages_failed"), AlertService.message(data));
                        })
                    });
                }
            };

            $scope.setKyla = function (kyla) {
                if (kyla) {
                    $scope.setKunta(kyla.kunta);
                }
            };


            /* Rakennustyyppi */
            $scope.rakennustyyppiOptions = [];
            $scope.getRakennustyyppiOptions = function () {
                ListService.getOptions('rakennustyyppi').then(function success(options) {
                    $scope.rakennustyyppiOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_building_options_failed"), AlertService.message(data));
                    });
                });
            };
            $scope.getRakennustyyppiOptions();

            $scope.curLocale = locale.getLocale();

            /*
             * Aluetyyppi
             */
            $scope.aluetyyppiOptions = [];
            $scope.getAluetyyppiOptions = function () {
                ListService.getOptions('aluetyyppi').then(function success(options) {
                    $scope.aluetyyppiOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_areatypes_options_failed"), AlertService.message(data));
                    });
                });
            };
            $scope.getAluetyyppiOptions();
            /*
             * Helper function - The original selection list items are filtered so that the already selected items are not present This method puts the items back to the list if/when they are removed.
             */
            $scope.addItemBackToList = function (item, model) {
                for (var i = 0; i < model.length; i++) {
                    if (model[i].id == item.id) {
                        return;
                    }
                }
                model.push(item);
            };

            $scope.updateInventointiprojektiId = function (id) {
                $scope.ui.searchInventointiprojektiId = id;
            };

            $scope.updateInventoija = function (id) {
                $scope.ui.searchInventoija = id;
            }

            $scope.updateLuoja = function (id) {
                $scope.ui.searchLuoja = id;
            }

            $scope.updateSuunnittelija = function (id) {
                $scope.ui.searchDesigner = id;
            }

            $scope.updateKunta = function (id) {
                $scope.ui.searchCounty = id;
            }

            /*
             * Valintalistojen arvojen haku
             */

            $scope.kayttajat = [];
            $scope.getKayttajat = function (search) {
                $scope.kayttajat.length = 0;
                var s = {
                    'rivit': 20,
                    'jarjestys': 'sukunimi',
                };
                if (search) {
                    s['nimi'] = search;
                }

                UserService.getUsers(s).then(function success(users) {
                    for (var i = 0; i < users.features.length; i++) {
                        $scope.kayttajat.push(users.features[i].properties);
                    }
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_users_failed"), AlertService.message(data));
                    })
                });
            };
            $scope.getKayttajat();

            /* Alkuperainen kaytto */
            $scope.alkuperainen_kayttoOptions = [];
            $scope.getAlkuperaisetkaytotOptions = function () {
                if ($scope.create || $scope.alkuperainen_kayttoOptions.length == 0) {
                    ListService.getOptions('kayttotarkoitus').then(function success(options) {
                        $scope.alkuperainen_kayttoOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_originalusage_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getAlkuperaisetkaytotOptions();

            /* Nykykaytto */
            $scope.nykykayttoOptions = [];
            $scope.getNykykaytotOptions = function () {
                if ($scope.create || $scope.nykykayttoOptions.length == 0) {
                    ListService.getOptions('kayttotarkoitus').then(function success(options) {
                        $scope.nykykayttoOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_currentusage_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getNykykaytotOptions();

            /* Perustustyyppi */
            $scope.perustusOptions = [];
            $scope.getPerustustyyppiOptions = function () {
                if ($scope.create || $scope.perustusOptions.length == 0) {
                    ListService.getOptions('perustus').then(function success(options) {
                        $scope.perustusOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_foundation_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getPerustustyyppiOptions();

            /* Runkotyyppi */
            $scope.runkoOptions = [];
            $scope.getRunkotyyppiOptions = function () {
                if ($scope.create || $scope.runkoOptions.length == 0) {
                    ListService.getOptions('runko').then(function success(options) {
                        $scope.runkoOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_frame_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getRunkotyyppiOptions();

            /* Vuoraustyyppi */
            $scope.vuorausOptions = [];
            $scope.getVuoraustyyppiOptions = function () {
                if ($scope.create || $scope.vuorausOptions.length == 0) {
                    ListService.getOptions('vuoraus').then(function success(options) {
                        $scope.vuorausOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_lining_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getVuoraustyyppiOptions();

            /* Kattotyyppi */
            $scope.kattoOptions = [];
            $scope.getKattotyyppiOptions = function () {
                if ($scope.create || $scope.kattoOptions.length == 0) {
                    ListService.getOptions('kattotyyppi').then(function success(options) {
                        $scope.kattoOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_ceiling_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getKattotyyppiOptions();

            /* Katetyyppi */
            $scope.kateOptions = [];
            $scope.getKatetyyppiOptions = function () {
                if ($scope.create || $scope.kateOptions.length == 0) {
                    ListService.getOptions('kate').then(function success(options) {
                        $scope.kateOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_cover_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getKatetyyppiOptions();

            /* Kuntotyyppi */
            $scope.kuntoOptions = [];
            $scope.getKuntotyyppiOptions = function () {
                if ($scope.create || $scope.kuntoOptions.length == 0) {
                    ListService.getOptions('kunto').then(function success(options) {
                        $scope.kuntoOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_condition_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getKuntotyyppiOptions();

            /* Nykytyyli */
            $scope.nykytyyliOptions = [];
            $scope.getNykytyyliOptions = function () {
                if ($scope.create || $scope.nykytyyliOptions.length == 0) {
                    ListService.getOptions('nykyinen_tyyli').then(function success(options) {
                        $scope.nykytyyliOptions = options;
                    }, function error(data) {
                        locale.ready('error').then(function () {
                            AlertService.showError(locale.getString("error.Getting_contemporarystyle_options_failed"), AlertService.message(data));
                        });
                    });
                }
            };
            $scope.getNykytyyliOptions();

            /* Purettu */
            $scope.purettuOptions = [];
            $scope.getPurettuOptions = function () {
                $scope.purettuOptions = ListService.getNoYes();
            };
            $scope.getPurettuOptions();


            /*
             * Kulttuurihistorialliset arvot
             */
            $scope.kulttuurihistorialliset_arvotOptions = [];
            $scope.getKulttuurihistoriallisetArvotOptions = function () {
                ListService.getOptions('kulttuurihistoriallinenarvo', 'rakennus').then(function success(options) {
                    for (var i = 0; i < options.data.features.length; i++) {
                        var opt = options.data.features[i];
                        $scope.kulttuurihistorialliset_arvotOptions.push({
                            id: opt.properties.id,
                            nimi_fi: opt.properties.nimi_fi,
                            nimi_se: opt.properties.nimi_se
                        });
                    }
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_culturohistorical_values_failed"), AlertService.message(data));
                    });
                });
            }
            $scope.getKulttuurihistoriallisetArvotOptions();

            $scope.suunnittelijat = [];
            $scope.getSuunnittelijat = function (search) {
                $scope.suunnittelijat.length = 0;
                var s = {
                    'rivit': 20,
                    'jarjestys': 'nimi',
                };
                if (search) {
                    s['nimi'] = search;
                }

                SuunnittelijaService.getSuunnittelijat(s).then(function success(suunnittelijat) {
                    for (var i = 0; i < suunnittelijat.features.length; i++) {
                        $scope.suunnittelijat.push(suunnittelijat.features[i].properties);
                    }
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Getting_users_failed"), AlertService.message(data));
                    })
                });
            };
            $scope.getSuunnittelijat();

            $scope.kohdeLajiOptions = [];
            $scope.getKohdeLajiOptions = function () {
                ListService.getOptions('ark_kohdelaji').then(function success(options) {
                    $scope.kohdeLajiOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Error"), AlertService.message(data));
                    });
                });
            };
            $scope.getKohdeLajiOptions();

            $scope.kohdeTyyppiOptions = [];
            $scope.getKohdeTyyppiOptions = function () {
                ListService.getOptions('ark_kohdetyyppi').then(function success(options) {
                    $scope.kohdeTyyppiOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Error"), AlertService.message(data));
                    });
                });
            };
            $scope.getKohdeTyyppiOptions();

            $scope.kohdeTyyppitarkenneOptions = [];
            $scope.getKohdeTyyppitarkenneOptions = function () {
                ListService.getOptions('ark_kohdetyyppitarkenne').then(function success(options) {
                    $scope.kohdeTyyppitarkenneOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Error"), AlertService.message(data));
                    });
                });
            };
            $scope.getKohdeTyyppitarkenneOptions();

            $scope.kohdeAjoitusOptions = [];
            $scope.getKohdeAjoitusOptions = function () {
                ListService.getOptions('ajoitus').then(function success(options) {
                    $scope.kohdeAjoitusOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Error"), AlertService.message(data));
                    });
                });
            };
            $scope.getKohdeAjoitusOptions();

            $scope.tutkimusLajiOptions = [];
            $scope.getTutkimusLajiOptions = function () {
                ListService.getOptions('ark_tutkimuslaji').then(function success(options) {
                    $scope.tutkimusLajiOptions = options;
                }, function error(data) {
                    locale.ready('error').then(function () {
                        AlertService.showError(locale.getString("error.Error"), AlertService.message(data));
                    });
                });
            };
            $scope.getTutkimusLajiOptions();

            // Tyhjän kohteen valintalista
            $scope.tyhjaKohdeArvot = [
                {id : 1, nimi_fi : "Tyhjä kohde: Ei"},
                {id : 2, nimi_fi : "Tyhjä kohde: Kyllä"},
                {id : 3, nimi_fi : "Tyhjä kohde: Kaikki"}
            ];
            // Asetetaan defaultiksi EI
            $scope.ui.searchKohdeTyhjakohde = 1;

            // Vaatii tarkastusta valintalista
            $scope.vaatiiTarkastustaArvot = [
                {id : 1, nimi_fi : "Vaatii tarkastusta: Ei"},
                {id : 2, nimi_fi : "Vaatii tarkastusta: Kyllä"},
                {id : 3, nimi_fi : "Vaatii tarkastusta: Kaikki"}
            ];
            // Asetetaan defaultiksi EI
            $scope.ui.searchVaatiiTarkastusta = 3;

            $scope.kohdeKyppitilatOptions = [
                {id : 1, nimi_fi : "Uudet kohteet"},
                {id : 2, nimi_fi : "Muokatut kohteet"}
            ];

            // Asetetaan defaultiksi kaikki
            $scope.ui.searchTutkimusValmis = 3;

            // Valintalista
            $scope.tutkimusValmisArvot = [
        		{id : 1, nimi_fi : "Tutkimuksen tila: Valmis"},
        		{id : 2, nimi_fi : "Tutkimuksen tila: Kesken"},
        		{id : 3, nimi_fi : "Tutkimuksen tila: Kaikki"}
            ];

            $scope.ui.searchTutkimusJulkinen = 3
            // Valintalista
            $scope.tutkimusJulkinenArvot = [
        		{id : 1, nimi_fi : "Tutkimus julkinen: Kyllä"},
        		{id : 2, nimi_fi : "Tutkimus julkinen: Ei"},
        		{id : 3, nimi_fi : "Tutkimus julkinen: Kaikki"}
    		];

        }]);
