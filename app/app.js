/**
 * Museon informaatioportaali
 * @desc
 * - Konfiguraatiot
 * - Välilehtien hallinta/navigointi
 * - Routet
 * - Http Response ja Request interceptorit
 * - Logitus
 */
var mip = angular.module(
        'mip',
        [
                'ngRoute', 'mgcrea.ngStrap', 'ui.select','openlayers-directive', 'ngLocalize', 'ngLocalize.Config', 'ngAnimate', 'ngTable',
                'as.sortable', 'ngFileUpload', 'ngCookies', 'cfp.hotkeys', 'ngLoadingSpinner', 'rzModule', 'ui.select', 'ngSanitize', 'angular-cache',
                'mip.login', 'mip.auth', 'mip.general', 'mip.search', 'mip.filters', 'mip.menu', 'mip.user', 'mip.directives', 'mip.alert', 'mip.file',
                'mip.muutoshistoria', 'mip.raportti', 'mip.kunta', 'mip.kyla', 'mip.map',
                'mip.kiinteisto', 'mip.rakennus', 'mip.alue', 'mip.arvoalue', 'mip.porrashuone',  'mip.suunnittelija', 'mip.inventointiprojekti',
                'mip.matkaraportti', 'mip.inventointijulkaisu', 'mip.yksikko', 'mip.kohde', 'mip.tutkimus', 'mip.loyto', 'mip.kori', 'mip.nayte',
                'mip.toimenpide', 'mip.kasittely', 'mip.konservointi.hallinta', 'mip.konservointi', 'qrScanner'
        ]).constant('CONFIG', {
    /** (backendin) osoitteen asetus */
    'API_URL' : 'http://localhost:8000/api/', // The value will be replaced in the build process
    /** API version asetus */
    'API_VERSION' : 'v1', // API version
    'APP_VERSION': 'v1.4.3 20221221',
    /** Onko debug päällä, httpRequestInterceptor käyttää */
    'DEBUG' : true, // Is debug on?
    /** Accept languages */
    'ACCEPT_LANGUAGE' : [
            'fi', 'se', 'en'
    ],
    'ORGANISATION': 'Test organisation', // The value can be changed in dev env and will be replaced in the build process
    'PROVINCE_NAME': 'Province name', // The value can be changed in dev env and will be replaced in the build process
    'KYPPI_ADMIN_ORGANISATION_CODE': 1, // The value can be changed in dev env and will be replaced in the build process
    /** Solr hakutulosten oletusmäärä hakupalkista haettaessa */
    'SEARCH_LIMIT' : 10,
    /** Jos koordinaatteja ei ole saatavilla, keskitetään näihin  */
    'DEFAULT_COORDINATES': [65.46, 25.68], // LAT LON  // The value can be changed in dev env and will be replaced in the build process
    'DEFAULT_MAP_CENTER': [6740448, 272462], // LAT LON  // The value can be changed in dev env and will be replaced in the build process
    'ROLES' : {
        'PROJECT' : {
            'OWNER' : 1,
            'RESEARCHER' : 2,
            'VIEWER' : 3,
            'INVENTOR' : 4,
            'ADMIN' : 5
        },
        'SYSTEM' : {}
    },
    /** Entiteettityyppien IDt - vastaavat kannassa olevia. TODO: Haku kannasta. */
    'ENTITY_TYPE_IDS' : {
        'kiinteisto' : 1,
        'rakennus' : 2,
        'porrashuone' : 3,
        'huone' : 4,
        'alue' : 5,
        'arvoalue' : 6,
        'kunta' : 7,
        'kyla' : 8,
        'suunnittelija' : 9,
        'inventointiprojekti' : 10,
        'matkaraportti' : 11,
        'projekti' : 12,
        'yksikko' : 13,
        'tutkimus' : 14,
        'kohde' : 15,
        'tutkimusalue' : 16,
        'loyto': 17,
        'nayte': 18,
        'rontgenkuva': 19,
        'toimenpide': 20,
        'kasittely': 21,
        'kuntoraportti': 22
    },
    'LOYTO_KUVA_TYYPIT' : {
        'muu' : 0,
        'loyto' : 1,
        'konservointi' : 2
    },

    /** Ladattavan kuvan maksimikoko */
    'MAX_IMAGE_SIZE' : '120MB',
    /** Ladattavan tiedoston maksimikoko */
    'MAX_FILE_SIZE' : '120MB',
    /** Käännöstiedostot jotka ovat käytössä - lista tarvitaan, koska tiedostot ladataan navbarControllerissa jotta vältytään lataamatta jääneiltä käännöksiltä. */
    translationFiles: ['area', 'ark', 'building', 'common', 'county', 'designer', 'error', 'estate',
      'inventoryproject', 'inventorypublication', 'kyla', 'map', 'research', 'sample', 'staircase',
      'unit', 'user', 'valuearea']
}).value('localeConf', {
    basePath : 'languages',
    defaultLocale : 'fi-FI',
    sharedDictionary : 'common',
    fileExtension : '.lang.json',
    persistSelection : true,
    cookieName : 'COOKIE_LOCALE_LANG',
    observableAttrs : new RegExp('^data-(?!ng-|i18n)'),
    delimiter : '::',
    validTokens : new RegExp('^[\\w\\.-]+\\.[\\w\\s\\.-]+\\w(:.*)?$')
}).value('localeSupported', [
        'fi-FI', 'sv-FI', 'en-US'
]).value('localeFallbacks', {
    'fi' : 'fi-FI',
    'se' : 'sv-FI',
    'en' : 'en-US'
}).run([
        "$rootScope", "$document", "$timeout", "$location", "$injector", "$cookies", function($rootScope, $document, $timeout, $location, $injector, $cookies) {
            /**
             * Proj4 is required because OPenLayer 3 does not support
             * EPSG:3067
             * Config from http://epsg.io/3067
             */
            proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
            // Map limits
            $rootScope.projection = ol.proj.get('EPSG:3067');
            $rootScope.projection.setExtent([
                    -548576, 6291456, 1548576, 8388608
            ]);

            $rootScope._modals = [];

            // Varastoidaan luodut modaalit
            $rootScope.$on('modal.show', function(e, $modal) {

                if ($rootScope._modals.indexOf($modal) === -1) {
                    $rootScope._modals.push($modal);
                    // Ilmoitus ikkunavalikon direktiiville uuden luonnista, jotta saadaan boldaus
                    $rootScope.$broadcast('modal_list', $modal);
                }

            });


            /*
             * Pitää ikkuna-valikon avoinna, kunnes suljetaan klikkaamalla valikon kuvakkeesta
             */
            $('.dropdown.keep-open').on({
                "shown.bs.dropdown": function(){
                	this.closable = false;
                },
                'hide.bs.dropdown':  function() {
                	return this.closable;
                }
            });

            // edit mode modal map id generation
            $rootScope._nextMapId = 1;

            $rootScope.getNextMapId = function() {
                return $rootScope._nextMapId++;
            };

            // Set the application language to Finnish by default IF no language cookie found. For some reason the localeConf above doesn't do it even though defaultLocale is set.
            var languageIsSet = $cookies.get('COOKIE_LOCALE_LANG');
            if(!languageIsSet) {
                $cookies.put('COOKIE_LOCALE_LANG', "\"fi-FI\"");
            }

            /*
             * Close all visible modals on logout
             */
            $rootScope.$on("$locationChangeStart", function(event, next, current) {

                if($location.url() == '/kirjaudu') {
                    if($rootScope._modals.length > 0) {
                        for (var i = $rootScope._modals.length-1; i >= 0; i--) {
                            $rootScope._modals[i].hide();
                            $rootScope._modals.splice(i, 1);
                        }
                    }
                }
            });

            // open modal if specified in the url
            $rootScope.$on("$locationChangeSuccess", function() {
                var paramMap = $location.search();

                if (paramMap["modalType"] && paramMap["modalId"]) {
                    $timeout(function() {
                        var ModalService = $injector.get('ModalService');
                        ModalService.openModal(paramMap["modalType"], paramMap["modalId"]);

                        $location.search("modalType", null);
                        $location.search("modalId", null);
                    });
                }
            });

            /*
             * TAB BAR
             */
            $rootScope.tabs = [];
            $rootScope.activeTab = "";
            $rootScope.subTabs = [];
            $rootScope.activeSubTab = "";

            /*
             * Setting active tab; invoked in every entity list controller; a good place to fetch the tabs, if not already fetched
             *
             * What tabs to show depends on if the user is an admin or not; that logic is also here
             */
            $rootScope.setActiveTab = function(activeTab) {
                if (activeTab != $rootScope.activeTab) {
                    // active main tab switched? clear subtabs!
                    $rootScope.subTabs.length = 0;
                }

                if ($rootScope.tabs.length == 0) {
                    $rootScope.activeTab = activeTab;

                    var locale = $injector.get('locale');
                    var TabService = $injector.get('TabService');

                    locale.ready('common').then(function() {
                        var UserService = $injector.get('UserService');
                        UserService.getUser().then(function(user) {

                            if (user.rooli == "pääkäyttäjä") {
                                $rootScope.tabs = TabService.getTabs();
                            } else {
                                var showReportTab = true;
                                $rootScope.tabs = TabService.getTabsNoAdmin(showReportTab);
                            }

                            $rootScope.subTabs = [];
                            $rootScope.setActiveSubTab($rootScope.activeSubTab);
                        });
                    });
                } else {
                    $rootScope.activeTab = activeTab;
                }
            };

            /*
             * Setting active subtab; invoked in every entity list controller; a good place to fetch the subtabs, if not already fetched
             */
            $rootScope.setActiveSubTab = function(activeSubTab) {
                $rootScope.activeSubTab = activeSubTab;

                if ($rootScope.subTabs.length == 0) {
                    var locale = $injector.get('locale');
                    var TabService = $injector.get('TabService');

                    locale.ready('common', 'ark').then(function() {
                        var UserService = $injector.get('UserService');
                        UserService.getUser().then(function(user) {
                            if ($rootScope.activeTab == locale.getString('common.Building_inventory')) {
                                var showMatkaraportit = false;
                                if(user.rooli !== 'katselija') {
                                    showMatkaraportit = true;
                                }
                                $rootScope.subTabs = TabService.getSubTabs(showMatkaraportit);
                            } else if ($rootScope.activeTab == locale.getString('common.Archeology')) {
                                $rootScope.subTabs = TabService.getArcSubTabs();
                            } else if ($rootScope.activeTab == locale.getString('common.Administration')) {
                                $rootScope.subTabs = TabService.getAdminSubTabs();
                            } else if ($rootScope.activeTab == locale.getString('common.Reports')) {
                                $rootScope.subTabs = TabService.getReportSubTabs();
                            } else if ($rootScope.activeTab == locale.getString('common.Search')) {
                            	$rootScope.subTabs = TabService.getSearchSubTabs();
                            } else {
                                $rootScope.subTabs = [];
                            }

                            $rootScope.activeSubTab = activeSubTab;
                        });
                    });
                }
            };

            /*
             * Tab navigation function
             */
            $rootScope.navigate = function(pane, subtab) {
                /*
                 * If a subtab is clicked, set its "parent" tab's href to the href of the clicked subtab; that way the main tabs "remember" which of their subtabs was clicked even when opening other main tabs
                 */
                if (subtab) {
                    for (var i = 0; i < $rootScope.tabs.length; i++) {
                        var tab = $rootScope.tabs[i];

                        if (tab.title == $rootScope.activeTab) {
                            tab.href = pane.tab.href;
                            break;
                        }
                    }
                }

                // If the Rakennusinventointi tab has been selected but no subtabs loaded, do not default to "/", but instead to "/kiinteistot".
                if (pane && pane.tab && pane.tab.href == '/') {
                    var locale = $injector.get('locale');
                    if (pane.tab.title == locale.getString('common.Building_inventory')) {
                        pane.tab.href = '/kiinteistot';
                    }
                }

                $location.path(pane.tab.href);
            }
        }
]);

/*
 * Application configuration, routes.
 */
mip.config([
        '$routeProvider', '$locationProvider', '$httpProvider', '$compileProvider', '$provide', '$qProvider', '$animateProvider', function($routeProvider, $locationProvider, $httpProvider, $compileProvider, $provide, $qProvider, $animateProvider) {
            $routeProvider.when('/kirjaudu', {
                templateUrl : 'kirjautuminen/login.html',
                controller : 'AuthController'
            }).when('/salasananpalautus', {
                templateUrl : 'kirjautuminen/salasananpalautus.html',
                controller : 'AuthController'
            }).when('/kunnat', {
                templateUrl : 'kunnat/kunnat.html',
                controller : 'KuntaListController'
            }).when('/kylat', {
                templateUrl : 'kylat/kylat.html',
                controller : 'KylaListController'
            }).when('/kartta', {
                templateUrl : 'kartta/map.html',
                controller : 'MapController'
            }).when('/valintalistat', {
                templateUrl : 'pages/valintalistat.html',
                controller : 'DropdownListController'
            }).when('/kayttajat', {
                templateUrl : 'kayttajat/kayttajat.html',
                controller : 'UserListController'
            }).when('/haku', {
                templateUrl : 'pages/haku.html',
                controller : 'SearchPageController'
            }).when('/hae', {
                templateUrl : 'img_file_search/search.html',
                controller : 'SearchListController'
            }).when('/raportit', {
                templateUrl : 'raportit/raportit.html',
                controller : 'RaporttiListController'
            }).when('/kiinteistot', {
                templateUrl : 'rak/kiinteistot/kiinteistot.html',
                controller : 'KiinteistoListController'
            }).when('/rakennukset', {
                templateUrl : 'rak/rakennukset/rakennukset.html',
                controller : 'RakennusListController'
            }).when('/porrashuoneet', {
                templateUrl : 'rak/porrashuoneet/porrashuoneet.html',
                controller : 'PorrashuoneListController'
            }).when('/alueet', {
                templateUrl : 'rak/alueet/alueet.html',
                controller : 'AlueListController'
            }).when('/arvoalueet', {
                templateUrl : 'rak/arvoalueet/arvoalueet.html',
                controller : 'ArvoalueListController'
            }).when('/matkaraportit', {
                templateUrl : 'rak/matkaraportit/matkaraportit.html',
                controller : 'MatkaraportitController'
            }).when('/inventointiprojektit', {
                templateUrl : 'rak/inventointiprojektit/inventointiprojektit.html',
                controller : 'InventointiprojektiListController'
            }).when('/suunnittelijat', {
                templateUrl : 'rak/suunnittelijat/suunnittelijat.html',
                controller : 'SuunnittelijaListController'
            }).when('/julkaisut', {
                templateUrl : 'rak/inventointijulkaisut/inventointijulkaisut.html',
                controller : 'InventointijulkaisuListController'
            }).when('/matkaraportit', {
                templateUrl: 'rak/matkaraportit/matkaraportit.html',
                controller: 'MatkaraporttiListController'
            }).when('/arkvalintalistat', {
                templateUrl : 'pages/ark/valintalistat.html',
                controller : 'ArkDropdownListController'
            }).when('/tutkimukset', {
                templateUrl : 'ark/tutkimukset/tutkimukset.html',
                controller : 'TutkimusListController',
                controllerAs : 'vm'
            }).when('/projektit', {
                templateUrl : 'ark/projektit/projektit.html',
                controller : 'ProjektiListController'
            }).when('/kohteet', {
                templateUrl : 'ark/kohteet/kohteet.html',
                controller : 'KohdeListController',
                controllerAs : 'vm'
            }).when('/loydot', {
                templateUrl : 'ark/loydot/loydot.html',
                controller : 'LoytoListController',
                controllerAs : 'vm'
            }).when('/naytteet', {
                templateUrl : 'ark/naytteet/naytteet.html',
                controller : 'NayteListController',
                controllerAs : 'vm'
            }).when('/ark_korit', {
                templateUrl : 'korit/korit.html',
                controller : 'ArkKoriListController',
                controllerAs : 'vm'
            }).when('/rak_korit', {
                templateUrl : 'korit/korit.html',
                controller : 'RakKoriListController',
                controllerAs : 'vm'
            }).when('/tekijanoikeuslausekkeet', {
                templateUrl : 'tekijanoikeuslausekkeet/tekijanoikeuslausekkeet.html',
                controller : 'TekijanoikeuslausekeListController',
                controllerAs : 'vm'
            }).when('/toimenpiteet', {
                templateUrl : 'ark/toimenpiteet/toimenpiteet.html',
                controller : 'ToimenpideListController',
                controllerAs : 'vm'
            }).when('/kasittelyt', {
                templateUrl : 'ark/kasittelyt/kasittelyt.html',
                controller : 'KasittelyListController',
                controllerAs : 'vm'
            }).when('/konservointi/hallinta', {
                templateUrl : 'ark/konservointihallinta/hallintapaneelit.html',
                controller : 'KonservointiHallintaController',
                controllerAs : 'vm'
            }).when('/rak_kuvat', {
                templateUrl : 'img_file_search/rak_search.html',
                controller : 'rakSearchListController',
                controllerAs : 'vm'
            }).when('/ark_kuvat', {
                templateUrl : 'img_file_search/ark_search.html',
                controller : 'arkSearchListController',
                controllerAs : 'vm'
            }).when('/ark_kartat', {
                templateUrl : 'img_file_search/ark_map_search.html',
                controller : 'arkMapSearchListController',
                controllerAs : 'vm'
            }).otherwise('/kirjaudu');

            /*
             * Add interceptors
             */
            $httpProvider.interceptors.push('httpResponseInterceptor');
            $httpProvider.interceptors.push('httpRequestInterceptor');

            /*
             * Production mode - Angular does not provide debug information when debugInfoEnabled = false
             */
            $compileProvider.debugInfoEnabled(true);

            /*
             * Do not generate error on rejected promises. Needs to be false because of the version
             */
            $qProvider.errorOnUnhandledRejections(false);

            /*
             * Boost performance (?)
             */
            $provide.decorator('$rootScope', [
                    '$delegate', function($delegate) {

                        Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
                            value : function(name, listener) {
                                var unsubscribe = $delegate.$on(name, listener);
                                this.$on('$destroy', unsubscribe);

                                return unsubscribe;
                            },
                            enumerable : false
                        });

                        return $delegate;
                    }
            ]);

            /*
             * Log the errors from the frontend to the backend also.
             */
            $provide.decorator('$exceptionHandler', [
                    '$delegate', '$window', '$log', 'CONFIG', 'SessionService', function($delegate, $window, $log, CONFIG, SessionService) {
                        return function(exception, cause) {
                            $delegate(exception, cause);

                            try {
                                var errorMessage = exception.message;

                                // Use AJAX, not Angular as angular might be dead already
                                $.ajax({
                                    type : "POST",
                                    beforeSend: function(request) {
                                        request.setRequestHeader('Authorization', 'Bearer ' + SessionService.get('token'))
                                    },
                                    url : CONFIG.API_URL + "log",
                                    contentType : "application/json",
                                    data : angular.toJson({
                                        url : $window.location.href,
                                        message : errorMessage,
                                        stack: exception.stack,
                                        type : "exception",
                                        cause : (cause || "")
                                    })
                                });
                            } catch (loggingError) {
                                $log.warn("Error server-side logging failed");
                                $log.log(loggingError);
                            }
                        }
                    }
            ]);

            /*
             *  Tällä saadaan ui-select boxista animointi pois, joka aiheuttaa koko sivun scrollaamisen ylös klikattaessa.
             *  Aseta halutulle selectille class="ng-animate-disabled"
             */
            $animateProvider.classNameFilter(/^(?:(?!ng-animate-disabled).)*$/);

        }
]);

/*
 * Response interceptor.
 */
mip.factory('httpResponseInterceptor', [
        '$location',
        '$window',
        '$q',
        '$injector',
        'SessionService',
        function($location, $window, $q, $injector, SessionService) {
            return {
                'request' : function(config) {
                    return config
                },
                'response' : function(result) {
                    var headers = result.headers();
                    return $q.resolve(result);
                },
                'responseError' : function(rejection) {
                    if (rejection.status == 400) { // Bad Request
                        console.log("App.js/ResponseInterceptor, 400 : ");
                        console.log(rejection);
                        // TODO:
                    } else if (rejection.status == 401) { // Unauthorized, renew token

                        // Show info about logging in again
                        var locale = $injector.get('locale');
                        var alertService = $injector.get('AlertService');
                        alertService.showError(locale.getString('common.Error'), alertService.message(rejection));

                        // Un-authorize user and change the path to the kirjaudu
                        SessionService.unset('token');
                        SessionService.setAuthenticated(false);
                        SessionService.setDestination($location.path());
                        $location.path('/kirjaudu');

                        /*
                         * // Renew the token: if (rejection.data && rejection.data.data && rejection.data.data.content && rejection.data.data.content.token) { console.log("Renewing token..."); SessionService.set('token', rejection.data.data.content.token); SessionService.setAuthenticated(true); } //
                         * Resend the request: // TODO: Resend the request to load the data or to open a modal // // REFACTOR ME! TODO: The rest (only kiinteistö done at the moment) // var url = rejection.config.url; console.log("OpenModal url: " + url); //
                         *
                         * if (url.indexOf("?") == -1) { var ModalService = $injector.get('ModalService');
                         *
                         * if (url.indexOf("http://") == 0) { url = url.substring(7); }
                         *
                         * try { var modalData = url.split('/');
                         *
                         * var modalType = modalData[1]; var objectId = modalData[2];
                         *
                         * if (modalType == "kiinteisto") { var KiinteistoService = $injector.get('KiinteistoService');
                         *
                         * KiinteistoService.fetchKiinteisto(objectId).then(function () { ModalService.kiinteistoModal(); }); } } catch (e) { console.log("ModalService / openModal: error: " + e); } }
                         */
                    } else if (rejection.status == 403) { // Forbidden
                        // Set user as not authenticated, clear token and redirect to the login page
                        console.log("App.js/ResponseInterceptor, 403 : ");
                        console.log(rejection);

                        // If the response message contains a specific key
                        // do not logout the user. Instead indicate that the
                        // user does not have permission to do something
                        // TODO: How about localization?? OR give the error message a number that is not changed.
                        if (rejection.data && rejection.data.response && rejection.data.response.message
                                && (rejection.data.response.message[0] == 'Required auth token is not provided.' || rejection.data.response.message[0] == "Vaadittu autentikointi token puuttuu.")) {
                            SessionService.unset('token');
                            SessionService.setAuthenticated(false);
                            SessionService.setDestination($location.path());
                            $location.path('/kirjaudu');
                        }
                    } else if (rejection.status == 404) { // Not found
                        // TODO:
                        console.log("App.js/ResponseInterceptor, 404 : ");
                        console.log(rejection);
                        // $location.path('/');
                    } else if (rejection.status == 500) { // Internal server
                        // error
                        // TODO:
                        console.log("App.js/ResponseInterceptor : 500 :");
                        console.log(rejection);
                        // $location.path('/kirjaudu');
                    }
                    return $q.reject(rejection);
                }
            }
        }
]);

/*
 * Interceptor for the request Adds the authorization token and API information to the message
 */
mip.factory('httpRequestInterceptor', [
        '$location', '$window', 'SessionService', 'CONFIG', '$cookies', function($location, $window, SessionService, CONFIG, $cookies) {
            var lang = $cookies.get('COOKIE_LOCALE_LANG');

            if (lang == "\"sv-FI\"") {
                lang = "se";
            } else if (lang == "\"en-US\"") {
                lang = "en";
            } else {
                lang = "fi";
            }
            var hri = {
                request : function($config) {
                    //Encode URI properly (required by IE)
                    $config.url = encodeURI($config.url);

                    $config.headers['Api-Version'] = CONFIG.API_VERSION;
                    $config.headers['Api-Debug'] = CONFIG.DEBUG;
                    $config.headers['Accept-Language'] = lang;
                    $config.headers['Authorization'] = 'Bearer ' + SessionService.get('token');
                    return $config;
                }
            }
            return hri;
        }
]);
