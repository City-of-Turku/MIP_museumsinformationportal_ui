/**
 * Modal service - Arkelogian laajennusosa, jossa määritellään modalien controllerit ja templatet.
 */
angular.module('mip.general').factory(
        'ModalServiceArkExtension',
        [
            '$rootScope', '$modal', 'CONFIG', 'Auth', 'AlertService', 'locale', '$timeout', 'KohdeService',
            function($rootScope, $modal, CONFIG, Auth, AlertService, locale, $timeout, KohdeService) {

                // Arkeologian modaalien aloitusnumero
                var modelNro =  100;
                /**
                 * Modaalin tunnistamiseen tarvitaan juokseva numero
                 */
                var nextModalNameIdIndex = function(){
                    modelNro++;

                    return "|" + modelNro;
                };

                var modalFunctions = {

                    /*
                     * Tutkimus.
                     * @param existing = true jos uuden lisäys
                     * @param tutkimus = valittu tutkimus
                     * @param kohde = kohde johon lisätään tutkimus
                     */
                    tutkimusModal : function(existing, tutkimus, kohde) {
                        var tutkimusTeksti = locale.getString('common.Add');
                        if(tutkimus != null) {
                            tutkimusTeksti = tutkimus.properties.nimi;
                        }
                        if(kohde != null){
                            tutkimusTeksti = kohde.properties.nimi;
                        }
                        var modalNameId = locale.getString('common.Research') + ": " + tutkimusTeksti + nextModalNameIdIndex();
                        if (existing) {
                            Auth.checkPermissions("arkeologia", "ark_tutkimus", tutkimus.properties.id).then(function(permissions) {
                                Auth.checkArkTutkimusSubPermissions(tutkimus.properties.id).then(function (subPermissions) {
                                    if (permissions.katselu) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controllerAs: 'vm',
                                                controller : 'TutkimusController',
                                                templateUrl : 'ark/tutkimukset/partials/tutkimus.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    tutkimus : function() {
                                                        return tutkimus;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    selectedModalNameId : function() {
                                                        return modalNameId;
                                                    },
                                                    kohde : function(){
                                                        return kohde;
                                                    },
                                                    subPermissions : function() {
                                                        return subPermissions;
                                                    }
                                                }
                                            });
                                        }, 10);
                                    } else {
                                        locale.ready('common').then(function() {
                                            locale.ready('research').then(function() {
                                                AlertService.showError(locale.getString('common.Error'), locale.getString('research.No_view_permission_single'));
                                            });
                                        });
                                    }
                                });

                            });
                            } else {
                                Auth.checkPermissions("arkeologia", "ark_tutkimus", null).then(function(permissions) {
                                    if (permissions.luonti) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controllerAs: 'vm',
                                                controller : 'TutkimusController',
                                                templateUrl : 'ark/tutkimukset/partials/tutkimus.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    tutkimus : function() {
                                                        return tutkimus;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    selectedModalNameId : function() {
                                                        return modalNameId;
                                                    },
                                                    kohde : function() {
                                                        return kohde;
                                                    },
                                                    subPermissions : function() {
                                                        return {'katselu': true, 'muokkaus': true, 'luonti': true, 'poisto': true};
                                                    }
                                                }
                                            });
                                        }, 10);
                                    } else {
                                        locale.ready('common').then(function() {
                                            locale.ready('research').then(function() {
                                                AlertService.showError(locale.getString('common.Error'), locale.getString('research.No_view_permission_single'));
                                            });
                                        });
                                    }
                                });
                            }
                        },
                        tutkimusMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' +locale.getString('common.Research') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'ark/tutkimukset/partials/tutkimusMuutoshistoria.html',
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
                        tutkimusKayttajatModal : function(tutkimus) {
                            var tutkimusKayttajatText = tutkimus.properties.nimi;
                            var modalNameId = locale.getString('common.Users') + ": " + tutkimusKayttajatText + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controllerAs: 'vm',
                                    controller : 'TutkimusKayttajatController',
                                    templateUrl : 'ark/tutkimukset/partials/tutkimuskayttajat.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        tutkimus : function() {
                                            return tutkimus;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        //TODO poistuu
                    projektiModal : function(existing, projekti) {
                        var projektiTeksti = locale.getString('common.Add');
                        if(projekti != null) {
                            projektiTeksti = projekti.properties.tunnus + " " + projekti.properties.nimi;
                        }
                        var modalNameId = locale.getString('common.Project') + ": " + projektiTeksti + nextModalNameIdIndex();
                        if (existing) {
                            Auth.checkPermissions("arkeologia", "ark_tutkimus", projekti.properties.id).then(function(permissions) {
                                if (permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controllerAs: 'pvm',
                                            controller : 'ProjektiController',
                                            templateUrl : 'ark/projektit/partials/projekti.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                projekti : function() {
                                                    return projekti;
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
                                        locale.ready('project').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('project.No_view_permission_single'));
                                        });
                                    });
                                }
                            });
                            } else {
                                Auth.checkPermissions("arkeologia", "ark_tutkimus", null).then(function(permissions) {
                                    if (permissions.luonti) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controllerAs: 'pvm',
                                                controller : 'ProjektiController',
                                                templateUrl : 'ark/projektit/partials/projekti.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    projekti : function() {
                                                        return projekti;
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
                                            locale.ready('project').then(function() {
                                                AlertService.showError(locale.getString('common.Error'), locale.getString('project.No_view_permission_single'));
                                            });
                                        });
                                    }
                                });
                            }
                        },
                        manageProjectUsersModal : function(projekti) {
                            var projektiKayttajatText = projekti.properties.tunnus + " " + projekti.properties.nimi;
                            var modalNameId = locale.getStirng('common.Users') + ": " + projektiKayttajatText + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'ManageProjectUsersController',
                                    templateUrl : 'ark/projektit/partials/projektikayttajat.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        projekti : function() {
                                            return projekti;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        /*
                         * Projekti: The projekti where the yksikko belongs, roolit: The projekti roles the user has (1: omistaja, 2: tutkija, 3: katselija)
                         */
                        projektiYksikotModal : function(projekti) {
                            Auth.checkPermissions("arkeologia", "ark_tutkimus", projekti.properties.id).then(function(permissions) {
                                if (permissions.muokkaus) {
                                    $modal({
                                        controller : 'YksikkoListController',
                                        templateUrl : 'ark/yksikot/partials/projektiyksikot.html',
                                        show : true,
                                        backdrop : false,
                                        container : '#main_mip_app',
                                        keyboard : false,
                                        resolve : {
                                            projekti : function() {
                                                return projekti;
                                            },
                                            permissions : function() {
                                                return permissions;
                                            }
                                        }
                                    });
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('unit').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('unit.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        kohdeModal : function(kohde, coordinates) {
                            var existing = false;
                            var kohdeTeksti = locale.getString('common.Add');
                            if(kohde) {
                                existing = true;
                                kohdeTeksti = kohde.properties.nimi;
                            }
                            var modalNameId = locale.getString('ark.Target') + ": " + kohdeTeksti + nextModalNameIdIndex();
                            if (existing) {
                                var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_kohde');
                            } else {
                                var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_kohde');
                            }

                            permissionPromise.then(function(permissions) {
                                if(permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controllerAs: 'vm',
                                            controller : 'KohdeController',
                                            templateUrl : 'ark/kohteet/partials/kohde.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                kohde : function() {
                                                    return kohde;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                },
                                                coordinates : function() {
                                                    return coordinates;
                                                },
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('error').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        kohdeMuutoshistoriaModal : function(historia, title) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Show_history') + ': ' +locale.getString('ark.Target') + ' ' + title + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuutoshistoriaController',
                                    templateUrl : 'ark/kohteet/partials/kohdeMuutoshistoria.html',
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
                        alakohdeModal : function(alakohde, parentModalId) {
                            var existing = false;
                            var teksti = locale.getString('common.Add');
                            if(alakohde) {
                                teksti = alakohde.nimi;
                                existing = true;
                            }
                            var modalNameId = locale.getString('ark.Subtarget') + ": " + teksti + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controllerAs: 'vm',
                                    controller : 'AlakohdeController',
                                    templateUrl : 'ark/alakohteet/partials/alakohde.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        existing : function() {
                                            return existing;
                                        },
                                        alakohde : function() {
                                            return alakohde;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        },
                                        parentModalId : function() {
                                            return parentModalId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        muinaisjaannosFeatureInfoModal : function(data, kohde, modalId) {
                            // Modaalin tunniste
                            var modalNameId = "";
                            if(kohde && kohde.properties && kohde.properties.nimi) {
                                modalNameId = locale.getString('common.Coordinate_information') + ': ' + kohde.properties.nimi + nextModalNameIdIndex();
                            } else {
                                modalNameId = locale.getString('common.Coordinate_information') + ': ' + nextModalNameIdIndex();
                            }
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'MuinaisjaannosFeatureInfoController',
                                    controllerAs : 'vm',
                                    templateUrl : 'ark/kohteet/partials/muinaisjaannosFeatureInfo.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        data : function() {
                                            return data;
                                        },
                                        kohde : function() {
                                            return kohde;
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
                        }, //Tutkimusalueen tiedoston latausikkuna
                        //Jos tutkimusalue on annettu, asetetaan sijaintia yhdelle tietylle tutkimusalueelle, muutoin se jää tyhjäksi
                        lisaaTutkimusalueTiedosto : function(tutkimus, parentModalId, tutkimusalue) {

                            var modalNameId = "";
                            modalNameId = locale.getString('ark.Add_research_area') + ': ' + nextModalNameIdIndex();

                            $timeout(function() {
                            $modal({
                                id : modalNameId,
                                controller : "LisaaTutkimusalueTiedostoController",
                                controllerAs : 'vm',
                                templateUrl : 'ark/tutkimusalueet/partials/lisaaTutkimusalueTiedosto.html',
                                show : true,
                                backdrop : false,
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    tutkimus : function() {
                                        return tutkimus;
                                    },
                                    selectedModalNameId : function() {
                                        return modalNameId;
                                    },
                                    parentModalId : function() {
                                        return parentModalId;
                                    },
                                    tutkimusalue : function() {
                                    	return tutkimusalue;
                                    }
                                }
                            });
                            }, 10);
                        },
                        //Jos tutkimusalue on annettu, asetetaan sijaintia ainoastaan yhdelle tutkimusalueelle.
                        lisaaTutkimusalueModal : function(tutkimus, parentModalId, data, tutkimusalue) {

                            var modalNameId = "";
                            modalNameId = locale.getString('ark.Add_research') + ': ' + nextModalNameIdIndex();

                            $modal({
                                id : modalNameId,
                                controller : "LisaaTutkimusalueController",
                                controllerAs : 'vm',
                                templateUrl : 'ark/tutkimusalueet/partials/lisaaTutkimusalue.html',
                                show : true,
                                backdrop : false,
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    selectedModalNameId : function() {
                                        return modalNameId;
                                    },
                                    parentModalId : function() {
                                        return parentModalId;
                                    },
                                    tutkimus : function() {
                                        return tutkimus;
                                    },
                                    data : function() {
                                        return data;
                                    },
                                    tutkimusalue : function() {
                                    	return tutkimusalue;
                                    }
                                }
                            });
                        },
                        //Tutkimusalue jonka tiedot avataan, modalId josta tämä ko. modaali on avattu.
                        tutkimusalueModal : function(tutkimusalue, parentModalId, tutkimus) {
                            var existing = false;
                            var tutkimusalueTeksti = locale.getString('common.Add');
                            if(tutkimusalue) {
                                existing = true;
                                tutkimusalueTeksti = tutkimusalue.properties.nimi;
                            }
                            var modalNameId = locale.getString('ark.Research_area') + ": " + tutkimusalueTeksti + nextModalNameIdIndex();

                            if (existing) {
                                var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_tutkimusalue', tutkimusalue.properties.id);
                            } else {
                                var permissionPromise = Auth.checkArkTutkimusSubPermissions(tutkimus.properties.id);
                            }

                            permissionPromise.then(function(permissions) {
                                if(permissions.katselu) {
                                    $timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controllerAs: 'vm',
                                            controller : 'TutkimusalueController',
                                            templateUrl : 'ark/tutkimusalueet/partials/tutkimusalue.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                existing : function() {
                                                    return existing;
                                                },
                                                tutkimusalue : function() {
                                                    return tutkimusalue;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                },
                                                parentModalId : function() {
                                                    return parentModalId
                                                },
                                                tutkimus : function() {
                                                    return tutkimus;
                                                }
                                            }
                                        });
                                    }, 10);
                                } else {
                                    locale.ready('common').then(function() {
                                        locale.ready('error').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        arkExistingImageLinkModal : function(entityTypeId, entityId, mode) {
                            $modal({
                                controller : "ArkExistingImageController",
                                templateUrl : "pages/ark/partials/existingImageLink.html",
                                show : true,
                                backdrop : "static",
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    entityTypeId : function() {
                                        return entityTypeId;
                                    },
                                    entityId : function() {
                                        return entityId;
                                    },
                                    mode : function() {
                                        return mode;
                                    }
                                }
                            });
                        },
                        /*
                         * Avaa yksikön muistiinpanojen syöttötilaan.
                         */
                        lisaaYksikkoModal : function(yksikko, tutkimusalue, permissions) {

                            var modalNameId = "";
                            modalNameId = locale.getString('unit.Add_unit') + ': ' + yksikko.properties.yksikkotunnus + nextModalNameIdIndex();

                            $modal({
                                id : modalNameId,
                                controllerAs: 'vm',
                                controller : "YksikkoController",
                                templateUrl : 'ark/yksikot/partials/muistiinpanot.html',
                                show : true,
                                backdrop : false,
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    selectedModalNameId : function() {
                                        return modalNameId;
                                    },
                                    yksikko : function() {
                                        return yksikko;
                                    },
                                    tutkimusalue : function(){
                                        return tutkimusalue;
                                    },
                                    permissions : function() {
                                        return permissions;
                                    }
                                }
                            });
                        },
                        /*
                         * Avaa yksikön tiedot katselutilaan.
                         */
                        yksikkoModal : function(yksikko, tutkimusalue, permissions) {

                            var modalNameId = "";
                            modalNameId = locale.getString('common.Unit') + ': ' + yksikko.properties.yksikkotunnus + nextModalNameIdIndex();

                            $modal({
                                id : modalNameId,
                                controllerAs: 'vm',
                                controller : "YksikkoController",
                                templateUrl : 'ark/yksikot/partials/yksikko.html',
                                show : true,
                                backdrop : false,
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    selectedModalNameId : function() {
                                        return modalNameId;
                                    },
                                    yksikko : function() {
                                        return yksikko;
                                    },
                                    tutkimusalue : function(){
                                        return tutkimusalue;
                                    },
                                    permissions : function() {
                                        return permissions;
                                    }
                                }
                            });
                        },
                        /*
                         * Avaa löydön. Samaa modaalin avausta käytetään yksikön löytöihin sekä löytö-välilehden löytöjen avaamiseen.
                         * isEdit = true -> muokkaustilaan (uuden löydön lisäämisessä)
                         */
                        loytoModal : function(loyto, isEdit) {

                            var modalNameId = "";
                            var alku = locale.getString('ark.Discovery');

                            if(isEdit){
                            	alku = locale.getString('unit.Add_discovery');
                            }

                            modalNameId = alku + ': ' + loyto.properties.luettelointinumero + nextModalNameIdIndex();

                            var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_loyto', loyto.properties.id);
                            permissionPromise.then(function(permissions) {
                            	// Katseluoikeus löytyy, voidaan jatkaa
                            	if(permissions.katselu) {
                                	$timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controllerAs: 'vm',
                                            controller : "LoytoController",
                                            templateUrl : 'ark/loydot/partials/loyto.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                },
                                                loyto : function() {
                                                    return loyto;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                },
                                                isEdit : function() {
                                                    return isEdit;
                                                }
                                            }
                                        });
                                	}, 10);

                                }else{
                                    locale.ready('common').then(function() {
                                        locale.ready('error').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
                                        });
                                    });
                                }
                            });

                        },
                        /*
                         * Avaa löytöjen haku / listaussivun.
                         */
                        yksikonLoydotModal : function(materiaalikoodi, yksikko, tutkimusalue, ajoitettu, permissions) {

                            var modalNameId = "";
                            modalNameId = locale.getString('ark.Search_discoveries') + ': ' + yksikko.properties.yksikkotunnus + nextModalNameIdIndex();

                            $modal({
                                id : modalNameId,
                                controllerAs: 'vm',
                                controller : "YksikonLoytoListController",
                                templateUrl : 'ark/loydot/partials/yksikon_loydot.html',
                                show : true,
                                backdrop : false,
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    selectedModalNameId : function() {
                                        return modalNameId;
                                    },
                                    materiaalikoodi : function() {
		                                return materiaalikoodi;
		                            },
                                    yksikko : function(){
                                        return yksikko;
                                    },
                                    tutkimusalue : function(){
                                        return tutkimusalue;
                                    },
                                    ajoitettu : function(){
                                        return ajoitettu;
                                    },
                                    permissions : function() {
                                        return permissions;
                                    }
                                }
                            });
                        },
                        /*
                         * Avaa löydön tapahtuman
                         */
                        loytoTapahtumaModal : function(tapahtuma, loyto) {
                            var modalNameId = "";

                            modalNameId = locale.getString('ark.Event') + ': ' +  tapahtuma.tapahtuma_tyyppi.nimi_fi + nextModalNameIdIndex();

                            var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_loyto', loyto.properties.id);
                            permissionPromise.then(function(permissions) {
                            	// Katseluoikeus löytyy, voidaan jatkaa
                            	if(permissions.katselu) {
                                	$timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controllerAs: 'vm',
                                            controller : "LoytoTapahtumaController",
                                            templateUrl : 'ark/loydot/partials/loydon_tapahtuma.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                },
                                                tapahtuma : function() {
                                                    return tapahtuma;
                                                },
                                                loyto : function() {
                                                    return loyto;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                }
                                            }
                                        });
                                	}, 10);

                                }else{
                                    locale.ready('common').then(function() {
                                        locale.ready('error').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
                                        });
                                    });
                                }
                            });

                        },
                        /*
                         * Avaa näytteen. Samaa modaalin avausta käytetään yksikön näytteiden sekä näyte-välilehden näytteiden avaamiseen.
                         * isCreate = true -> muokkaustilaan (uuden löydön lisäämisessä)
                         */
                        nayteModal : function(nayte, isCreate) {
                            var modalNameId = "";

                            if(isCreate){
                            	modalNameId = locale.getString('sample.Add_sample') + nextModalNameIdIndex();
                            }else{
                            	locale.ready('sample').then(function() {
                            		modalNameId = locale.getString('sample.Sample') + ': ' + nayte.properties.luettelointinumero + nextModalNameIdIndex();
                            	});
                            }

                            // Uuden luonnissa ei vielä ole näytteen id tiedossa.
                            if (isCreate) {
                                var permissionPromise = Auth.checkArkTutkimusSubPermissions(nayte.properties.ark_tutkimus_id);
                            } else {
                            	var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_nayte', nayte.properties.id);
                            }

                            permissionPromise.then(function(permissions) {
	                            if(permissions.katselu) {
		                            $timeout(function() {
			                            $modal({
			                                id : modalNameId,
			                                controllerAs: 'vm',
			                                controller : "NayteController",
			                                templateUrl : 'ark/naytteet/partials/nayte.html',
			                                show : true,
			                                backdrop : false,
			                                container : '#main_mip_app',
			                                keyboard : false,
			                                resolve : {
			                                	selectedModalNameId : function() {
		                                            return modalNameId;
		                                        },
			                                    nayte : function(){
			                                        return nayte;
			                                    },
			                                    isCreate : function() {
			                                        return isCreate;
			                                    },
		                                        permissions : function() {
		                                            return permissions;
		                                        }
			                                }
			                            });
		                            }, 10);
	                            }else{
	                                locale.ready('common').then(function() {
	                                    locale.ready('error').then(function() {
	                                        AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
	                                    });
	                                });
	                            }
                            });
                        },
                        /*
                         * Avaa näytteen tapahtuman
                         */
                        nayteTapahtumaModal : function(tapahtuma, nayte) {

                            var modalNameId = "";

                            modalNameId = locale.getString('ark.Event') + ': ' +  tapahtuma.tapahtuma_tyyppi.nimi_fi + nextModalNameIdIndex();

                            var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_nayte', nayte.properties.id);
                            permissionPromise.then(function(permissions) {
                            	// Katseluoikeus löytyy, voidaan jatkaa
                            	if(permissions.katselu) {
                                	$timeout(function() {
                                        $modal({
                                            id : modalNameId,
                                            controllerAs: 'vm',
                                            controller : "NayteTapahtumaController",
                                            templateUrl : 'ark/naytteet/partials/naytteen_tapahtuma.html',
                                            show : true,
                                            backdrop : false,
                                            container : '#main_mip_app',
                                            keyboard : false,
                                            resolve : {
                                                selectedModalNameId : function() {
                                                    return modalNameId;
                                                },
                                                tapahtuma : function() {
                                                    return tapahtuma;
                                                },
                                                nayte : function() {
                                                    return nayte;
                                                },
                                                permissions : function() {
                                                    return permissions;
                                                }
                                            }
                                        });
                                	}, 10);
                                }else{
                                    locale.ready('common').then(function() {
                                        locale.ready('error').then(function() {
                                            AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
                                        });
                                    });
                                }
                            });
                        },
                        /*
                         * Avaa näytteiden haku- / listaussivun.
                         */
                        yksikonNaytteetModal : function(naytekoodi, yksikko, tutkimusalue, permissions) {
                            modalNameId = locale.getString('sample.Search_samples') + ': ' + yksikko.properties.yksikkotunnus + nextModalNameIdIndex();
                            $modal({
                                id : modalNameId,
                                controllerAs: 'vm',
                                controller : "YksikonNayteListController",
                                templateUrl : 'ark/naytteet/partials/yksikon_naytteet.html',
                                show : true,
                                backdrop : false,
                                container : '#main_mip_app',
                                keyboard : false,
                                resolve : {
                                    selectedModalNameId : function() {
                                        return modalNameId;
                                    },
                                    naytekoodi : function() {
		                                return naytekoodi;
		                            },
                                    yksikko : function(){
                                        return yksikko;
                                    },
                                    tutkimusalue : function(){
                                        return tutkimusalue;
                                    },
                                    permissions : function() {
                                        return permissions;
                                    }
                                }
                            });
                        },
                        /*
                         * ark, kuvan lisäys
                         */
                        arkImageUploadModal : function(objectType, relatedObject, luetteloi, tutkimusId) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Select_images') + ': ' + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'ArkImageUploadController',
                                    controllerAs: 'vm',
                                    templateUrl : 'ark/kuva/kuvapartials/imageUpload.html',
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
                                        },
                                        luetteloi : function() {
                                        	return luetteloi;
                                        },
                                        tutkimusId : function() {
                                        	return tutkimusId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        /*
                         * Olemassa olevan kuvan muokkaus
                         */
                        arkImageModal : function(image, entiteetti_tyyppi, entiteetti, permissions, kuvalista, tutkimusId) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Image') + ': ' +image.properties.luettelointinumero + nextModalNameIdIndex();
                            //Kuvan avaamisen yhteydessä annetaan permissionit mukana, niitä ei enää tarkasteta avaamisen jälkeen.
                                $timeout(function() {
                                    $modal({
                                        id : modalNameId,
                                        controller : 'ArkImageController',
                                        templateUrl : 'ark/kuva/kuvapartials/imageView.html',
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
                                            tutkimusId : function() {
                                            	return tutkimusId;
                                            },
                                            selectedModalNameId : function() {
                                                return modalNameId;
                                            }
                                        }
                                    });
                                }, 10);
                        },
                        /*
                         * Avaa konservointitiedot joko löydön tai näytteen.
                         */
                        konservointiModal : function(loyto, nayte, tutkimus ) {
                            var modalNameId = "";

                            if(loyto){
                            	locale.ready('ark').then(function() {
                            		modalNameId = locale.getString('ark.Conservation') + ': ' + loyto.properties.luettelointinumero + nextModalNameIdIndex();
                            	});
                            }else{
                            	locale.ready('ark').then(function() {
                            		modalNameId = locale.getString('ark.Conservation') + ': ' + nayte.properties.luettelointinumero + nextModalNameIdIndex();
                            	});
                            }

                            if (loyto) {
                                var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_loyto', loyto.properties.id);
                            } else {
                            	var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_nayte', nayte.properties.id);
                            }

                            permissionPromise.then(function(permissions) {
	                            if(permissions.katselu) {
		                            $timeout(function() {
			                            $modal({
			                                id : modalNameId,
			                                controllerAs: 'vm',
			                                controller : "KonservointiController",
			                                templateUrl : 'ark/konservointi/partials/konservointi.html',
			                                show : true,
			                                backdrop : false,
			                                container : '#main_mip_app',
			                                keyboard : false,
			                                resolve : {
			                                	selectedModalNameId : function() {
		                                            return modalNameId;
		                                        },
			                                    loyto : function(){
			                                        return loyto;
			                                    },
			                                    nayte : function(){
			                                        return nayte;
			                                    },
			                                    tutkimus : function(){
			                                        return tutkimus;
			                                    },
		                                        permissions : function() {
		                                            return permissions;
		                                        }
			                                }
			                            });
		                            }, 10);
	                            }else{
	                                locale.ready('common').then(function() {
	                                    locale.ready('error').then(function() {
	                                        AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
	                                    });
	                                });
	                            }
                            });
                        },
                        /*
                         * Avaa konservoinnin käsittelyn. Uuden tai olemassa olevan.
                         */
                        kasittelyModal : function(kasittely, isCreate) {
                            var modalNameId = "";

                            if(isCreate){
                            	modalNameId = locale.getString('ark.Add_treatment') + nextModalNameIdIndex();
                            }else{
                           		modalNameId = locale.getString('ark.Treatment') + ': ' + kasittely.properties.kasittelytunnus + nextModalNameIdIndex();
                            }

                            // Uuden luonnissa ei vielä ole id tiedossa.
                            // Löydön oikeudet riittänee
                            if (isCreate) {
                                var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_loyto');
                            } else {
                            	var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_loyto', kasittely.properties.id);
                            }

                            permissionPromise.then(function(permissions) {
	                            if(permissions.katselu) {
		                            $timeout(function() {
			                            $modal({
			                                id : modalNameId,
			                                controllerAs: 'vm',
			                                controller : "KasittelyController",
			                                templateUrl : 'ark/kasittelyt/partials/kasittely.html',
			                                show : true,
			                                backdrop : false,
			                                container : '#main_mip_app',
			                                keyboard : false,
			                                resolve : {
			                                	selectedModalNameId : function() {
		                                            return modalNameId;
		                                        },
			                                    kasittely : function(){
			                                        return kasittely;
			                                    },
			                                    isCreate : function() {
			                                        return isCreate;
			                                    },
		                                        permissions : function() {
		                                            return permissions;
		                                        }
			                                }
			                            });
		                            }, 10);
	                            }else{
	                                locale.ready('common').then(function() {
	                                    locale.ready('error').then(function() {
	                                        AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
	                                    });
	                                });
	                            }
                            });
                        },
                        /*
                         * ark, kartan lisäys
                         */
                        arkKarttaUploadModal : function(objectType, relatedObject, tutkimusId) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Select_images') + ': ' + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'ArkKarttaUploadController',
                                    templateUrl : 'ark/kartta/karttapartials/karttaUpload.html',
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
                                        },
                                        tutkimusId : function() {
                                        	return tutkimusId;
                                        }
                                    }
                                });
                            }, 10);
                        },
                        /*
                         * ark, karttaliitetiedoston tietojen katselu/muokkaus
                         * kartta, 'loyto', vm.loyto, vm.permissions, vm.kartat, vm.tutkimus.id
                         */
                        arkKarttaModal : function(kartta, entiteetti_tyyppi, entiteetti, permissions, karttalista, tutkimusId) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Map') + ': ' + kartta.properties.tyyppi.numero + ':' + kartta.properties.karttanumero + nextModalNameIdIndex();
                            //Kuvan avaamisen yhteydessä annetaan permissionit mukana, niitä ei enää tarkasteta avaamisen jälkeen.
                                $timeout(function() {
                                    $modal({
                                        id : modalNameId,
                                        controller : 'ArkKarttaController',
                                        templateUrl : 'ark/kartta/karttapartials/karttaView.html',
                                        show : true,
                                        backdrop : false,
                                        container : '#main_mip_app',
                                        keyboard : false,
                                        resolve : {
                                            kartta : function() {
                                                return kartta;
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
                                            karttalista : function() {
                                                return karttalista;
                                            },
                                            tutkimusId : function() {
                                            	return tutkimusId;
                                            },
                                            selectedModalNameId : function() {
                                                return modalNameId;
                                            }
                                        }
                                    });
                                }, 10);
                        },
                        /*
                         * Avaa konservointitoimenpiteen. Uuden, olemassa olevan tai kopioitavan.
                         */
                        toimenpideModal : function(toimenpide, isCreate, isCopy) {
                            var modalNameId = "";

                            if(isCreate || isCopy){
                            	modalNameId = locale.getString('ark.Add_operation') + nextModalNameIdIndex();
                            }else {
                            	// Avataan olemassa oleva
                           		modalNameId = locale.getString('ark.Operation') + ': ' + toimenpide.properties.toimenpide.nimi + nextModalNameIdIndex();
                            }

                            // Löydön oikeudet riittänee
                            var permissionPromise = Auth.checkPermissions('arkeologia', 'ark_loyto');

                            permissionPromise.then(function(permissions) {
	                            if(permissions.katselu) {
		                            $timeout(function() {
			                            $modal({
			                                id : modalNameId,
			                                controllerAs: 'vm',
			                                controller : "ToimenpideController",
			                                templateUrl : 'ark/toimenpiteet/partials/toimenpide.html',
			                                show : true,
			                                backdrop : false,
			                                container : '#main_mip_app',
			                                keyboard : false,
			                                resolve : {
			                                	selectedModalNameId : function() {
		                                            return modalNameId;
		                                        },
			                                    toimenpide : function(){
			                                        return toimenpide;
			                                    },
			                                    isCopy : function() {
			                                        return isCopy;
			                                    },
			                                    isCreate : function() {
			                                        return isCreate;
			                                    },
		                                        permissions : function() {
		                                            return permissions;
		                                        }
			                                }
			                            });
		                            }, 10);
	                            }else{
	                                locale.ready('common').then(function() {
	                                    locale.ready('error').then(function() {
	                                        AlertService.showError(locale.getString('common.Error'), locale.getString('error.No_view_permission'));
	                                    });
	                                });
	                            }
                            });
                        },
                        /*
                         * Röntgenkuva.
                         * @param existing = true jos uuden lisäys
                         * @param xray = valittu tutkimus
                         */
                        rontgenModal : function(existing, xray, tutkimusId, relatedObjectType, relatedObject) {
                            var xrayTeksti = locale.getString('common.Add');
                            if(xray != null) {
                            	xrayTeksti = xray.properties.numero;
                            }

                            var modalNameId = locale.getString('ark.XRay_image') + ": " + xrayTeksti + nextModalNameIdIndex();
                            if (existing) {
                            	var permissionPromise = Auth.checkArkTutkimusSubPermissions(tutkimusId);
                                permissionPromise.then(function(permissions) {
                                    if (permissions.katselu) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controllerAs: 'vm',
                                                controller : 'RontgenkuvaController',
                                                templateUrl : 'ark/rontgenkuvat/partials/rontgenkuva.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                	selectedModalNameId : function() {
                                                		return modalNameId;
                                                	},
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    xray : function() {
                                                        return xray;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    relatedObjectType : function() {
                                                    	return relatedObjectType;
                                                    },
                                                    relatedObject : function() {
                                                    	return relatedObject;
                                                    },
                                                    tutkimusId : function() {
                                                    	return tutkimusId;
                                                    }
                                                }
                                            });
                                        }, 10);
                                    } else {
                                        locale.ready('common').then(function() {
                                            locale.ready('research').then(function() {
                                                AlertService.showError(locale.getString('common.Error'), locale.getString('research.No_view_permission_single'));
                                            });
                                        });
                                    }
                                });
                            } else {
                                var permissionPromise = Auth.checkArkTutkimusSubPermissions(tutkimusId);
                                permissionPromise.then(function(permissions) {
                                    if (permissions.luonti) {
                                        $timeout(function() {
                                            $modal({
                                                id : modalNameId,
                                                controllerAs: 'vm',
                                                controller : 'RontgenkuvaController',
                                                templateUrl : 'ark/rontgenkuvat/partials/rontgenkuva.html',
                                                show : true,
                                                backdrop : false,
                                                container : '#main_mip_app',
                                                keyboard : false,
                                                resolve : {
                                                	selectedModalNameId : function() {
    		                                            return modalNameId;
    		                                        },
                                                    existing : function() {
                                                        return existing;
                                                    },
                                                    xray : function() {
                                                        return xray;
                                                    },
                                                    permissions : function() {
                                                        return permissions;
                                                    },
                                                    relatedObjectType : function() {
                                                    	return relatedObjectType;
                                                    },
                                                    relatedObject : function() {
                                                    	return relatedObject;
                                                    }, tutkimusId : function() {
                                                    	return tutkimusId;
                                                    }
                                                }
                                            });
                                        }, 10);
                                    } else {
                                        locale.ready('common').then(function() {
                                            locale.ready('research').then(function() {
                                                AlertService.showError(locale.getString('common.Error'), locale.getString('research.No_view_permission_single'));
                                            });
                                        });
                                    }
                                });
                            }
                        },
                        /*
                         * ARK, tiedostojen lisäys
                         */
                        arkFileUploadModal : function(objectType, relatedObject, tutkimusId) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Select_files') + ': ' + nextModalNameIdIndex();
                            $timeout(function() {
                                $modal({
                                    id : modalNameId,
                                    controller : 'arkFileUploadController',
                                    templateUrl : 'ark/tiedosto/tiedostopartials/fileUpload.html',
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
                                        },
                                        tutkimusId: function() {
                                        	return tutkimusId;
                                        }
                                    }
                                });
                            }, 10)
                        },
                        /*
                         * ark, tiedostojen muokkaus
                         */
                        arkFileModal : function(file, entiteetti_tyyppi, entiteetti, permissions, tutkimusId) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.File') + ': ' + file.properties.otsikko + nextModalNameIdIndex();
                                $timeout(function() {
                                    $modal({
                                        id : modalNameId,
                                        controller : 'arkFileController',
                                        templateUrl : 'ark/tiedosto/tiedostopartials/arkFileView.html',
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
                                            },
                                            tutkimusId : function() {
                                            	return tutkimusId;
                                            }
                                        }
                                    });
                                }, 10);

                        },
                        arkCoordinateFileUploadModal : function(entityType,  tutkimus) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('common.Select_files') + ': ' + nextModalNameIdIndex();
                            $timeout(function() {
                                console.log(entityType);
                                $modal({
                                    id : modalNameId,
                                    controller : 'LisaaSijaintiTiedostoController',
                                    controllerAs : 'vm',
                                    templateUrl : 'ark/tutkimukset/partials/lisaaSijaintiTiedosto.html',
                                    show : true,
                                    backdrop : false,
                                    container : '#main_mip_app',
                                    keyboard : false,
                                    resolve : {
                                        entityType : function() {
                                            return entityType;
                                        },
                                        selectedModalNameId : function() {
                                            return modalNameId;
                                        },
                                        tutkimus: function() {
                                        	return tutkimus;
                                        }
                                    }
                                });
                            }, 10)
                        },
                        /*
                         * loydon konservointiraportin tekosivu
                         */
                        arkLoytoKonservointiraporttiModal : function(loyto) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('ark.Conservation_report') + ': ' + loyto.properties.luettelointinumero + nextModalNameIdIndex();

                                $timeout(function() {
                                    $modal({
                                        id : modalNameId,
                                        controller : 'ArkLoytoKonservointiraporttiController',
                                        controllerAs : 'vm',
                                        templateUrl : 'ark/konservointi/partials/loyto_konservointiraportti_luontisivu.html',
                                        show : true,
                                        backdrop : false,
                                        container : '#main_mip_app',
                                        keyboard : false,
                                        resolve : {
                                            loyto : function() {
                                                return loyto;
                                            },
                                            selectedModalNameId : function() {
                                                return modalNameId;
                                            }
                                        }
                                    });
                                }, 10);
                        },
                        /*
                         * Tutkimusraportin tekosivu
                         */
                        arkTutkimusraporttiModal : function(tutkimusraportti, tutkimus, permissions) {
                            // Modaalin tunniste
                            var modalNameId = locale.getString('ark.Research_report') + ': ' + tutkimus.nimi + nextModalNameIdIndex();

                                $timeout(function() {
                                    $modal({
                                        id : modalNameId,
                                        controller : 'ArkTutkimusraporttiController',
                                        controllerAs : 'vm',
                                        templateUrl : 'ark/tutkimukset/partials/tutkimusraportti_tayttosivu.html',
                                        show : true,
                                        backdrop : false,
                                        container : '#main_mip_app',
                                        keyboard : false,
                                        resolve : {
                                            tutkimusraportti : function() {
                                                return tutkimusraportti;
                                            },
                                            tutkimus : function() {
                                                return tutkimus;
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
                        },
                        /*
                        * Löydön kuntokartoitusraportin luontisivu
                        */
                       arkKuntoraporttiModal : function(kuntoraportti, loyto, tutkimus, permissions) {
                           // Modaalin tunniste
                           var modalNameId = locale.getString('ark.Condition_report') + ': ' + loyto.luettelointinumero + nextModalNameIdIndex(); // TODO Muuta nimi

                               $timeout(function() {
                                   $modal({
                                       id : modalNameId,
                                       controller : 'ArkKuntoraporttiController',
                                       controllerAs : 'vm',
                                       templateUrl : 'ark/konservointi/partials/kuntoraportti_tayttosivu.html',
                                       show : true,
                                       backdrop : false,
                                       container : '#main_mip_app',
                                       keyboard : false,
                                       resolve : {
                                          kuntoraportti : function() {
                                            return kuntoraportti;
                                          },
                                          loyto : function() {
                                            return loyto;
                                          },
                                          tutkimus : function() {
                                              return tutkimus;
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
                       },

                }
                return modalFunctions;
            }
        ]);