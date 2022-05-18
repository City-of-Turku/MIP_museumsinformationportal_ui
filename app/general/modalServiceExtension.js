/**
 * Modal service - Laajennusosa, jossa määritetty yleisten ja rakennusinventoinnin modalien controllerit ja templatet.
 */
angular.module('mip.general').factory(
        'ModalServiceExtension',
        [
            '$rootScope', '$modal', 'CONFIG','KuntaService', 'KiinteistoService', 'RakennusService', 'AlueService', 'ArvoalueService', 'InventointiprojektiService', 'UserService',
            'KylaService', 'PorrashuoneService', 'SuunnittelijaService', 'YksikkoService', 'Auth', 'AlertService', 'locale', '$timeout',
            'InventointijulkaisuService', 'MatkaraporttiService', 'KohdeService',
            function($rootScope, $modal, CONFIG, KuntaService, KiinteistoService, RakennusService, AlueService, ArvoalueService, InventointiprojektiService, UserService,
                    KylaService, PorrashuoneService, SuunnittelijaService, YksikkoService, Auth, AlertService, locale, $timeout,
                    InventointijulkaisuService, MatkaraporttiService, KohdeService) {

            	var modelNro =  1;
            	/**
            	 * Modaalin tunnistamiseen tarvitaan juokseva numero
            	 */
            	var nextModalNameIdIndex = function(){
                	modelNro++;

                	return "|" + modelNro;
            	};

                var modalFunctions = {

                        toggleFullScreen : function(resizeIcon) {
                            var mdl = $rootScope._modals[$rootScope._modals.length - 1];

                            var $actualModal = $(mdl.$element[0].children[0]);
                            var $modalContent = $($actualModal[0].children[0]);
                            var $modalBody = $($modalContent[0].children[1]);

                            if ($actualModal.hasClass("mip-modal")) {
                                $actualModal.removeClass("mip-modal");
                                $actualModal.addClass("mip-modal-fullscreen");

                                $modalBody.removeClass("modal-body");
                                $modalBody.addClass("modal-body-fullscreen");
                            } else {
                                $actualModal.removeClass("mip-modal-fullscreen");
                                $actualModal.addClass("mip-modal");

                                $modalBody.removeClass("modal-body-fullscreen");
                                $modalBody.addClass("modal-body");
                            }
                            if (resizeIcon == "▢") {
                                resizeIcon = "–";
                            } else {
                                resizeIcon = "▢";
                            }
                            return resizeIcon;
                        },
                        /*
                         * YLEISET
                         */
                        /**
                         * Käyttäjän asetukset -modal
                         * @desc Käyttäjän asetusten hallintasivun modal
                         * @param {objekti} käyttäjä
                         */
                        userModal : function(user) {
                            var kayttajaId = locale.getString('common.New') + ' ' + locale.getString('common.User');
                            var sukunimi = '';
                            var etunimi = '';
                            if(user != null){
                                kayttajaId = user.id;
                                sukunimi = user.sukunimi;
                                etunimi = user.etunimi;
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.User') + ': ' + kayttajaId + ' ' + sukunimi + ' ' + etunimi + nextModalNameIdIndex();
                            $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                $modal({
                                    id : modalNameId,
                                    controller : 'UserController',
                                    templateUrl : 'kayttajat/partials/kayttaja.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        mode : function() {
                                            return 'edit';
                                        },
                                        user : function() {
                                            return user;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        kuntaModal : function(existing, kunta) {
                            var kuntaNumero = locale.getString('common.Add');
                            var kuntaNimi = '';
                            if(kunta != null){
                                kuntaNumero = kunta.properties.kuntanumero;
                                kuntaNimi = kunta.properties.nimi;
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.County') + ': ' + kuntaNumero + ' ' + kuntaNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "kunta").then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controller : 'KuntaController',
                                            templateUrl : 'kunnat/partials/kunta.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                kunta : function() {
                                                    return kunta;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            },
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('county').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('county.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        kuntaMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' +locale.getString('common.County') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'kunnat/partials/kuntaMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        kylaModal : function(existing, kyla) {
                            var kylaNumero = locale.getString('common.Add');
                            var kylaNimi = '';
                            if(kyla != null){
                                kylaNumero = kyla.properties.kylanumero;
                                kylaNimi = kyla.properties.nimi;
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Village') + ': ' + kylaNumero + ' ' + kylaNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "kyla").then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controller : 'KylaController',
                                            templateUrl : 'kylat/partials/kyla.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                kunnat : function() {
                                                    return KuntaService.getKunnat();
                                                },
                                                kyla : function() {
                                                    return kyla;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('kyla').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('kyla.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        kylaMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Village') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'kylat/partials/kylaMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        /*
                         * Näytetään loginin yhteydessä katselijalle.
                         */
                        showKatselijaInfoModal : function() {
                            // Modaalin tunniste
                            var modalNameId = 'Info' + nextModalNameIdIndex();
                            $modal({
                                id : modalNameId,
                                controller: "LoginInfoController",
                                templateUrl: "kirjautuminen/partials/katselijaLoginInfo.html",
                                show : true,
                                backdrop : false,
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    selectedModalNameId : function() {
                                        return modalNameId;
                                    }
                                }
                            });
                        },
                        featureInfoModal : function(data, host) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Details') + ': '  + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'FeatureinfoController',
                                    templateUrl : 'kartta/featureinfo.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        data : function() {
                                            return data;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        },
                                        host : function() {
                                        	return host;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        raporttiModal : function(koriId, koriTyyppi) {

                        	// Vain jos korin kautta valittu raportin luonti
                        	var valittuKoriId = null;
                        	var valittuKorityyppi = null;
                        	if(koriId && koriTyyppi){
                        		valittuKoriId = koriId;
                        		valittuKorityyppi = koriTyyppi;
                        	}

                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Report') + ': ' +  nextModalNameIdIndex();
                            $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                $modal({
                                    id : modalNameId,
                                    controller : 'RaporttiController',
                                    templateUrl : 'raportit/partials/raportti.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        },
                                        valittuKoriId : function(){
                                        	return valittuKoriId;
                                        },
                                        valittuKorityyppi : function(){
                                        	return valittuKorityyppi;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        /*
                         * RAKENNUSINVENTOINTI
                         */
                        kiinteistoModal : function(kiinteisto, coordinates) {
                            var kiinteistoNimi = locale.getString('common.Add');
                            if(kiinteisto != null){
                                if(kiinteisto.properties.nimi) {
                                    kiinteistoNimi = kiinteisto.properties.nimi;
                                } else {
                                    kiinteistoNimi = " ";
                                }
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Estate') + ': ' + kiinteistoNimi + nextModalNameIdIndex();

                            Auth.checkPermissions("rakennusinventointi", "kiinteisto").then(function(permissions) {
                                if (permissions.katselu) {
                                    Auth.checkPermissions("rakennusinventointi", "rakennus").then(function(rakennusPermissions) {
                                        $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                            $modal({
                                                id : modalNameId,
                                                controller : 'KiinteistoController',
                                                templateUrl : 'rak/kiinteistot/partials/kiinteisto.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                    coordinates : function() {
                                                        return coordinates;
                                                    },
                                                    kiinteisto : function() {
                                                        return kiinteisto;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    rakennusPermissions : function() {
                                                        return rakennusPermissions;
                                                    },
                                                    selectedModalNameId : function() {
                                                        return modalNameId;
                                                    }
                                                }
                                            });
                                        }, 10);
                                    });
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('estate').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_estate_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        kiinteistoMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Estate') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/kiinteistot/partials/kiinteistoMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        kiinteistoFetchedDetailsModal : function(data, kiinteisto, modalId) {
                            // Modaalin tunniste
                            var modalNameId  = "";
                            if(kiinteisto && kiinteisto.properties && kiinteisto.properties.nimi) {
                                modalNameId = locale.getString('common.Coordinate_information') + ': ' + kiinteisto.properties.nimi + nextModalNameIdIndex();
                            } else {
                                modalNameId = locale.getString('common.Coordinate_information') + ': ' + nextModalNameIdIndex();
                            }
                            // modalId - the "window" that initiates the opening of the fetchedDetailsModal
                            // (so that we know to which modal the retreived data belongs to)
                            $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                $modal({
                                    id : modalNameId,
                                    controller : 'KiinteistoFetchedDetailsController',
                                    templateUrl : 'rak/kiinteistot/partials/kiinteistoFetchedDetails.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        data : function() {
                                            return data;
                                        },
                                        kiinteisto : function() {
                                            return kiinteisto;
                                        },
                                        modalId : function() {
                                            return modalId;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    },
                                });
                            }, 10);
                        },
                        rakennusModal : function(existing, rakennus, kiinteisto_id, coordinates) {

                            var rakennusInvNro = locale.getString('common.Add');
                            var rakennusNimi = '';
                            if(rakennus != null){
                                rakennusInvNro = rakennus.properties.inventointinumero;
                                rakennusNimi = rakennus.properties.kiinteisto.nimi;
                            }

                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Building') + ': ' + rakennusInvNro + ' ' + rakennusNimi + nextModalNameIdIndex();

                            Auth.checkPermissions("rakennusinventointi", "rakennus").then(function(permissions) {
                                if (permissions.katselu) {
                                    Auth.checkPermissions("rakennusinventointi", "porrashuone").then(function(porrashuonePermissions) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controller : 'RakennusController',
                                                templateUrl : 'rak/rakennukset/partials/rakennus.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    kiinteisto_id : function() {
                                                        return kiinteisto_id
                                                    },
                                                    coordinates : function() {
                                                        return coordinates;
                                                    },
                                                    rakennus : function() {
                                                        return rakennus;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    porrashuonePermissions : function() {
                                                        return porrashuonePermissions;
                                                    },
                                                    selectedModalNameId : function() {
                                                        return modalNameId;
                                                    }
                                                },
                                            });
                                        }, 10);
                                    });
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('building').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('building.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        rakennusMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Building') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/rakennukset/partials/rakennusMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        rakennusFetchedDetailsModal : function(data, rakennus, modalId) {
                            // Modaalin tunniste
                            var modalNameId = "";
                            if(rakennus && rakennus.properties && rakennus.properties.kiinteisto && rakennus.properties.kiinteisto.nimi) {
                                modalNameId = locale.getString('common.Coordinate_information') + ': ' + rakennus.properties.kiinteisto.nimi + nextModalNameIdIndex();
                            } else {
                                modalNameId = locale.getString('common.Coordinate_information') + ': ' + nextModalNameIdIndex();
                            }
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'RakennusFetchedDetailsController',
                                    templateUrl : 'rak/rakennukset/partials/rakennusFetchedDetails.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        data : function() {
                                            return data;
                                        },
                                        rakennus : function() {
                                            return rakennus;
                                        },
                                        modalId : function() {
                                            return modalId;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    },
                                });
                            }, 10);
                        },
                        siirraRakennusModal : function(rakennus) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('building.Move_to_estate') + ': ' + rakennus.properties.kiinteisto.nimi + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'SiirraRakennusController',
                                    templateUrl : 'rak/rakennukset/partials/siirraRakennus.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        rakennus : function() {
                                            return rakennus;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    },
                                });
                            }, 10);
                        },
                        alueModal : function(existing, alue) {
                            var alueNimi = locale.getString('common.Add');
                            if(alue != null){
                                alueNimi = alue.properties.nimi;
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Area') + ': ' + alueNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "alue").then(function(permissions) {
                                if (permissions.katselu) {
                                    Auth.checkPermissions("rakennusinventointi", "arvoalue").then(function(arvoaluePermissions) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controller : 'AlueController',
                                                templateUrl : 'rak/alueet/partials/alue.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    alue : function() {
                                                        return alue;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    arvoaluePermissions : function() {
                                                        return arvoaluePermissions;
                                                    },
                                                    selectedModalNameId : function() {
                                                        return modalNameId;
                                                    }
                                                },
                                            });
                                        }, 10);
                                    });
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('area').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('area.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        alueMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Area') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/alueet/partials/alueMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        arvoalueModal : function(existing, arvoalue, alue) {

                            var arvoalueNimi = locale.getString('common.Add');
                            var alueNimi = '';
                            if(arvoalue != null){
                                arvoalueNimi = arvoalue.properties.nimi;
                            }
                            if(alue != null){
                                alueNimi = alue.properties.nimi;
                            }

                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Valuearea') + ': ' + arvoalueNimi + ' ' + alueNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "arvoalue").then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controller : 'ArvoalueController',
                                            templateUrl : 'rak/arvoalueet/partials/arvoalue.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                arvoalue : function() {
                                                    return arvoalue;
                                                },
                                                alue : function() {
                                                    return alue;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('valuearea').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('valuearea.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        arvoalueMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Valuearea') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/arvoalueet/partials/arvoalueMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        porrashuoneModal : function(existing, porrashuone, rakennus_id, coordinates) {

                            var porrashuoneTunnus = locale.getString('common.Add');
                            if(porrashuone != null){
                                porrashuoneTunnus = porrashuone.properties.porrashuoneen_tunnus;
                            }

                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Staircase') + ': ' + porrashuoneTunnus + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "porrashuone").then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controller : 'PorrashuoneController',
                                            templateUrl : 'rak/porrashuoneet/partials/porrashuone.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                rakennus_id : function() {
                                                    return rakennus_id
                                                },
                                                porrashuone : function() {
                                                    return porrashuone;
                                                },
                                                coordinates : function() {
                                                    return coordinates;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            },
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('staircase').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('staircase.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        porrashuoneMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Staircase') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/porrashuoneet/partials/porrashuoneMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        suunnittelijaModal : function(existing, suunnittelija) {
                            var suunnittelijaNimi = locale.getString('common.Add');
                            if(suunnittelija != null){
                                suunnittelijaNimi = suunnittelija.properties.sukunimi;
                                if(suunnittelija.properties.etunimi != null){
                                    suunnittelijaNimi += ' ' + suunnittelija.properties.etunimi;
                                }
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Architect') + ': ' + suunnittelijaNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "suunnittelija").then(function(permissions) {
                                if (permissions.katselu) {
                                    Auth.checkPermissions("rakennusinventointi", "rakennus").then(function(rakennusPermissions) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controller : 'SuunnittelijaController',
                                                templateUrl : 'rak/suunnittelijat/partials/suunnittelija.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    suunnittelija : function() {
                                                        return suunnittelija;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    rakennusPermissions : function() {
                                                        return rakennusPermissions;
                                                    },
                                                    selectedModalNameId : function() {
                                                        return modalNameId;
                                                    }
                                                }
                                            });
                                        }, 10);
                                    });
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('designer').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('designer.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        suunnittelijaMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Architect') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/suunnittelijat/partials/suunnittelijaMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        inventointiprojektiModal : function(existing, inventointiprojekti) {
                            var projektiNimi = locale.getString('common.Add');
                            if(inventointiprojekti != null){
                                projektiNimi = inventointiprojekti.properties.nimi;
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Inventory_project') + ': ' + projektiNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "inventointiprojekti").then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controller : 'InventointiprojektiController',
                                            templateUrl : 'rak/inventointiprojektit/partials/inventointiprojekti.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                inventointiprojekti : function() {
                                                    return inventointiprojekti;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('inventoryproject').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('inventoryproject.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        inventointiprojektiMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Inventory_project') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/inventointiprojektit/partials/inventointiprojektiMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        /*
                         * Rakennusinventointi, tiedostojen lisäys
                         */
                        fileUploadModal : function(objectType, relatedObject) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Select_files') + ': ' + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'FileUploadController',
                                    templateUrl : 'rak/tiedosto/tiedostopartials/fileUpload.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        objectType : function() {
                                            return objectType;
                                        },
                                        relatedObject : function() {
                                            return relatedObject;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10)
                        },
                        /*
                         * Rakennusinventointi, tiedostojen muokkaus
                         */
                        fileModal : function(file, entiteetti_tyyppi, entiteetti) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.File') + ': ' + file.properties.otsikko + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "tiedosto").then(function(permissions) {
                                $timeout(function() {
                                    $modal({
                                        id : modalNameId,
                                        controller : 'FileController',
                                        templateUrl : 'rak/tiedosto/tiedostopartials/fileView.html',
                                        show : true,
                                        backdrop : false,
                                        container : '#main_mip_app',
                                        keyboard : false,
                                        resolve : {
                                            file : function() {
                                                return file;
                                            },
                                            entiteetti_tyyppi : function() {
                                                return entiteetti_tyyppi;
                                            },
                                            entiteetti : function() {
                                                return entiteetti;
                                            },
                                            permissions : function() {
                                                return permissions;
                                            },
                                            selectedModalNameId : function() {
                                                return modalNameId;
                                            }
                                        }
                                    });
                                }, 10);
                            }, function error(data) {
                                locale.ready('common').then(function() {
                                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                                });
                            });
                        },
                        /*
                         * Rakennusinventointi, kuvan lisäys
                         */
                        imgUploadModal : function(objectType, relatedObject) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Select_images') + ': ' + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'ImageUploadController',
                                    templateUrl : 'rak/tiedosto/kuvapartials/imgUpload.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        objectType : function() {
                                            return objectType;
                                        },
                                        relatedObject : function() {
                                            return relatedObject;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        /*
                         * Rakennusinventointi, olemassa olevan kuvan muokkaus
                         */
                        imageModal : function(image, entiteetti_tyyppi, entiteetti, permissions, kuvalista) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Image') + ': ' +image.properties.otsikko + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "kuva").then(function(permissions) {
                                $timeout(function() {
                                    $modal({
                                        id : modalNameId,
                                        controller : 'ImageController',
                                        templateUrl : 'rak/tiedosto/kuvapartials/imageView.html',
                                        show : true,
                                        backdrop : false,
                                        container : '#main_mip_app',
                                        keyboard : false,
                                        resolve : {
                                            image : function() {
                                                return image;
                                            },
                                            entiteetti_tyyppi : function() {
                                                return entiteetti_tyyppi;
                                            },
                                            entiteetti : function() {
                                                return entiteetti;
                                            },
                                            permissions : function() {
                                                return permissions;
                                            },
                                            kuvalista : function() {
                                                return kuvalista;
                                            },
                                            selectedModalNameId : function() {
                                                return modalNameId;
                                            }
                                        }
                                    });
                                }, 10);
                            }, function error(data) {
                                locale.ready('common').then(function() {
                                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                                });
                            });
                        },
                        siirraKuvaModal : function(images, entiteetti_tyyppi, entiteetti, kiinteistotunnus) {
                            // Modaalin tunniste
                            var txt = locale.getString('common.Image');
                            if(images.length === 1) {
                                txt = images[0].properties.otsikko;
                            } else {
                                txt = images.length + " " + locale.getString('common.Images');
                            }
                            var modalNameId = locale.getString('common.Move_to_estate_or_building') + ': ' + txt + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'SiirraKuvaController',
                                    templateUrl : 'rak/tiedosto/kuvapartials/siirraKuva.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        images : function() {
                                            return images;
                                        },
                                        entiteetti : function() {
                                            return entiteetti;
                                        },
                                        entiteetti_tyyppi : function() {
                                            return entiteetti_tyyppi;
                                        },
                                        kiinteistotunnus : function() {
                                            if(kiinteistotunnus !== undefined) {
                                                return kiinteistotunnus;
                                            } else if(entiteetti_tyyppi === 'kiinteisto') {
                                                return entiteetti.properties.kiinteistotunnus;
                                            } else if(entiteetti_tyyppi === 'rakennus') {
                                                return entiteetti.properties.kiinteisto.kiinteistotunnus;
                                            } else {
                                                return "";
                                            }
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        inventointijulkaisuModal : function(inventointijulkaisu, existing) {
                            var julkaisuNimi = locale.getString('common.Add');
                            if(inventointijulkaisu != null){
                                julkaisuNimi = inventointijulkaisu.properties.nimi;
                            }
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Inventory_publication') + ': ' + julkaisuNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "inventointijulkaisu").then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                        $modal({
                                            id : modalNameId,
                                            controller : 'InventointijulkaisuController',
                                            templateUrl : 'rak/inventointijulkaisut/partials/inventointijulkaisu.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                inventointijulkaisu : function() {
                                                    return inventointijulkaisu;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                existing: function() {
                                                    return existing;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('estate').then(function() { //TODO: FIX ERROR MESSAGE
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_estate_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        inventointijulkaisuMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Inventory_publication') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/inventointijulkaisut/partials/inventointijulkaisuMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        matkaraporttiModal : function(matkaraportti, existing, kiinteisto) {
                            // Lisättäessä matkaraporttia, ei vielä löydy tässä vaiheessa kiinteistötunnusta
                            var matkarapotunnus = locale.getString('common.Add');
                            if(matkaraportti != null){
                                matkarapotunnus = matkaraportti.properties.kiinteisto.kiinteistotunnus;
                            }

                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Travel_report') + ': ' + matkarapotunnus + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "matkaraportti").then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                        $modal({
                                            id : modalNameId,
                                            controller : 'MatkaraporttiController',
                                            templateUrl : 'rak/matkaraportit/partials/matkaraportti.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                matkaraportti : function() {
                                                    return matkaraportti;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                existing: function() {
                                                    return existing;
                                                },
                                                kiinteisto: function() {
                                                    return kiinteisto;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('estate').then(function() { //TODO: FIX ERROR MESSAGE
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_estate_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        matkaraporttiMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' + locale.getString('common.Travel_report') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'rak/matkaraportit/partials/matkaraporttiMuutoshistoria.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        historia : function() {
                                            return historia;
                                        },
                                        title : function() {
                                            return title;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        // Lisää uusi kori
                        uusiKoriModal : function(kori, mip_alue) {

                        	// käyttäjä valitsee korityypin
                        	var korityyppi = null;

                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.New_cart') + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controllerAs: 'vm',
                                    controller : 'KoriController',
                                    templateUrl : 'korit/partials/kori.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                    	koriIdLista : function() {
                                            return null;
                                        },
                                        korityyppi : function() {
                                            return korityyppi;
                                        },
                                        kori : function() {
                                            return kori;
                                        },
                                        uusiKori : function() {
                                            return true;
                                        },
                                        mip_alue : function() {
                                            return mip_alue;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        },
                                        kayttajat : function() {
                                            return null;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        // Avaa korin tietojen lisäämiseen
                        lisaaKoriModal : function(koriIdLista, korityyppi, mip_alue) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Add_to_cart') + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controllerAs: 'vm',
                                    controller : 'KoriController',
                                    templateUrl : 'korit/partials/kori.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                    	koriIdLista : function() {
                                            return koriIdLista;
                                        },
                                        korityyppi : function() {
                                            return korityyppi;
                                        },
                                        kori : function() {
                                            return null;
                                        },
                                        uusiKori : function() {
                                            return false;
                                        },
                                        mip_alue : function() {
                                            return mip_alue;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        },
                                        kayttajat : function() {
                                            return null;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        // Avaa korin tiedot korivälilehdeltä
                        koriModal : function(kori, mip_alue) {

                        	if(kori){
                        		var korityyppi = kori.properties.korityyppi;
                        		var nimi = kori.properties.nimi;
                                var kayttajat = kori.properties.kayttajat;
                        	}
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Cart') + ': ' + nimi + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controllerAs: 'vm',
                                    controller : 'KoriController',
                                    templateUrl : 'korit/partials/kori.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                    	koriIdLista : function() {
                                            return null;
                                        },
                                        korityyppi : function() {
                                            return korityyppi;
                                        },
                                        kori : function() {
                                            return kori;
                                        },
                                        uusiKori : function() {
                                            return false;
                                        },
                                        mip_alue : function() {
                                            return mip_alue;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        },
                                        kayttajat : function() {
                                            return kayttajat;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        kuvasiirrinModal : function(parentModalId, entiteettiId, entiteettiTyyppi, images) {

                            // Modaalin tunniste
                            var modalNameId = 'kuvasiirrin' + nextModalNameIdIndex();//locale.getString('common.Inventory_publication') + ': ' + julkaisuNimi + nextModalNameIdIndex();
                            Auth.checkPermissions("rakennusinventointi", "kiinteisto").then(function(permissions) {
                                if (permissions.muokkaus) {
                                    $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                        $modal({
                                            id : modalNameId,
                                            controller : 'KuvasiirrinController',
                                            templateUrl : 'directives/kuvasiirrin/kuvasiirrin.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                parentModalId : function() {
                                                    return parentModalId;
                                                },
                                                images : function() {
                                                    return images;
                                                },
                                                entiteettiId : function() {
                                                    return entiteettiId;
                                                },
                                                entiteettiTyyppi : function() {
                                                    return entiteettiTyyppi;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('estate').then(function() { //TODO: FIX ERROR MESSAGE
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_estate_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        // Reitin ID joka tullaan poistamaan, puoli, entiteettityyppi ja id oikeuksien tarkastusta varten
                        // puoli: rakennusinventointi tai arkeologia
                        // Tällä hetkellä modalin kautta pystyy ainoastaan poistamaan valitun reitin, ei muokkaamaan.
                        reittiModal : function(reitti, puoli, entiteettiTyyppi, entiteetti) {
                            var modalNameId = 'reitti' + nextModalNameIdIndex();
                            var permissionsPromise = null;
                            var permissions = null;
                            // Ark tutkimuksen oikeudet menevät eri tavalla
                            if(entiteettiTyyppi == 'ark_tutkimus') {
                                permissionsPromise = Auth.checkArkTutkimusSubPermissions(entiteetti.properties.id)
                            } else {
                                permissionsPromise = Auth.checkPermissions(puoli, entiteettiTyyppi)
                            }

                            permissionsPromise.then(function(perms) {
                                permissions = perms;
                                if (permissions.muokkaus) {
                                    $timeout(function() { // Timeout tarvitaan, muutoin avattu modal voi jäädä edellisen alle.
                                        $modal({
                                            id : modalNameId,
                                            controllerAs: 'vm',
                                            controller : 'ReittiController',
                                            templateUrl : 'pages/reittiModal.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                reitti : function() {
                                                    return reitti;
                                                },
                                                entiteettiTyyppi: function() {
                                                    return entiteettiTyyppi;
                                                },
                                                entiteetti: function() {
                                                    return entiteetti;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('error').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_required_permissions'));
                                        });
                                    });
                                }
                            });
                        }

                	}
                return modalFunctions;
                }
        ]);