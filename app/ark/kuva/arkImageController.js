angular.module('mip.file').controller(
        'ArkImageController',
        [
                '$scope', '$rootScope', 'CONFIG', '$http', 'ModalService', 'AlertService',
                '$timeout', 'FileService', 'image', 'locale', 'entiteetti_tyyppi', 'entiteetti',
                'permissions', 'UserService', 'kuvalista',  'selectedModalNameId', 'tutkimusId',
                'LoytoService', 'YksikkoService', 'NayteService', 'EntityBrowserService', 'ListService', 'KohdeService',
                function($scope, $rootScope, CONFIG, $http, ModalService, AlertService,
                		$timeout, FileService, image, locale, entiteetti_tyyppi, entiteetti,
                		permissions, UserService, kuvalista, selectedModalNameId, tutkimusId,
                		LoytoService, YksikkoService, NayteService, EntityBrowserService, ListService, KohdeService) {

                    // Unique modal id which is used for the collapsible panels
                    $scope.modalId = ModalService.getNextModalId();
                    $scope.tags = {};

                    // Valitun modalin nimi ja järjestysnumero
                    $scope.modalNameId = selectedModalNameId;
                    $scope.kuvaussuunnat = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                    $scope.image = image;
                    $scope.original = angular.copy($scope.image);
                    $scope.entiteetti_tyyppi = entiteetti_tyyppi;
                    $scope.relatedObject = entiteetti;
                    $scope.permissions = permissions;
                    $scope.resizeIcon = "▢";
                    $scope.tags = null;
                    $scope.tutkimusId = tutkimusId;
                    $scope.userRole = UserService.getProperties().user.ark_rooli;
                    $scope.luetteloitu = $scope.image.properties.luettelointinumero == null ? false : true;

                    // Options for NoYes dropdown list
                    $scope.noYes = ListService.getNoYes();

                    // Is the form in edit mode or not
                    $scope.edit = false;

                    //Asetetaan tiedostonimi oikeaksi jos käyttäjä haluaa ladata kuvan.
                    if($scope.image.properties.luettelointinumero) {
                    	var filetype = $scope.image.properties.tiedostonimi.split(".")[1];
                    	$scope.downloadFilename = $scope.image.properties.luettelointinumero.replaceAll(":", "-") + "." + filetype;
                    } else {
                    	$scope.downloadFilename = $scope.image.properties.tiedostonimi;
                    }

                    $scope.list = kuvalista;

                    $scope.changeImage = function(image) {
                        $scope.image = image;
                        $scope.original = angular.copy($scope.image);
                        $scope.showExifData();
                        $scope.fixAsiasanat();
                    };

                    /*
                     * Poistetaan asiasanoista turhat tiedot, säilytetään ainoastaan lista joka sisältää asiasanan, ei id yms tietoja.
                     * Jos turhat tiedot on jo poistettu, ei poisteta niitä enää uudelleen.
                     */
                    $scope.fixAsiasanat = function() {
                    	var tmpAsiasanat = [];
                    	for(var i = 0; i<$scope.image.properties.asiasanat.length; i++) {
                    		//Asiasanat fiksataan jokaisen avauksen yhteydessä, mutta ne tarvii fiksata vain kerran
                    		if($scope.image.properties.asiasanat[i].asiasana) {
                    			tmpAsiasanat.push($scope.image.properties.asiasanat[i].asiasana);
                    		} else {
                    			tmpAsiasanat.push($scope.image.properties.asiasanat[i]);
                    		}
                    	}
                    	$scope.image.properties.asiasanat = tmpAsiasanat;
                    };
                    $scope.fixAsiasanat();

                    $scope.showEditAndDeleteButtons = function() {
                    	//Oman kuvan saa poistaa tai jos permissioneissa sanotaan että edit tai delete
                        if (UserService.getProperties().user.id == $scope.image.properties.luoja.id || $scope.permissions.muokkaus || $scope.permissions.poisto) {
                            return true;
                        } else {
                            return false;
                        }
                    };
                    $scope.showEditAndDeleteButtons();

                    /*
                     * Get the exif data _after_ the image has loaded
                     */
                    $scope.showExifData = function() {
                        var imgElem = document.getElementById("image");
                        $scope.setExifData(imgElem);
                    };
                    /*
                     * Extract the exif data from the image. Currently handles only the date information. If needed, extend to function(img, tag, ...) for more general functionality.
                     */
                    $scope.setExifData = function(img) {
                        // Get the date
                        EXIF.getData(img, function() {

                            // Get all tags instead of only the DateTimeOriginal, because reading the
                            // single tag failed from time to time for unkown reasons
                            var data = EXIF.getAllTags(this);
                            var tags = null;
                            if (data) {
                                tags = {};
                            }

                            for ( var a in data) {
                                if (data.hasOwnProperty(a)) {

                                    tags[a] = "";
                                    if (typeof data[a] == "object") {
                                        if (data[a] instanceof Number) {
                                            tags[a] = data[a] + " [" + data[a].numerator + "/" + data[a].denominator + "]";
                                        } else if (angular.isArray(data[a])) {
                                            if (data[a].length < 5) {
                                                for (var i = 0; i < data[a].length; i++) {
                                                    tags[a] += data[a][i] + ", ";
                                                }
                                            } else {
                                                tags[a] = "[...]";
                                            }
                                        }
                                    } else {
                                        tags[a] = data[a];
                                    }
                                }
                            }

                            if (tags['undefined']) {
                                delete tags['undefined'];
                            }
                            $scope.tags = tags;
                       });
                    }
                    ;

                    /*
                     * OPERATIONS
                     */

                    $scope.konservointivaiheet = [];
                    ListService.getOptions('ark_konservointivaihe').then(function success(options) {
                		$scope.konservointivaiheet = options;
                    }, function error(data) {
                        locale.ready('error').then(function() {
                            // TODO
                            // AlertService.showError(locale.getString("error.Getting_culturohistorical_values_failed"), AlertService.message(data));
                            console.log(data);
                        });
                    });

                    $scope.updateOtsikko = function() {
                    	var loytonumero = $scope.relatedObject.properties.luettelointinumero;
                    	$scope.image.properties.otsikko = loytonumero;
                    	if($scope.image.properties.konservointivaihe_id) {
                    		for(var i = 0; i<$scope.konservointivaiheet.length; i++) {
                    			if($scope.konservointivaiheet[i].id == $scope.image.properties.konservointivaihe_id) {
                    				$scope.image.properties.otsikko += " " + $scope.konservointivaiheet[i].nimi_fi;
                            		$scope.image.properties.konservointivaihe = $scope.konservointivaiheet[i];
                    			}
                    		}
                    	}
                    }
                    /*
                     * Cancel view mode
                     */
                    $scope.close = function() {
                        if ($scope.edit) {
                            $scope.cancelEdit();
                        }
                    	// Sulkee modaalin ja poistaa listalta
                    	ModalService.closeModal($scope.modalNameId);
                        $scope.$destroy();
                    };
                    /*
                     * Cancel edit mode
                     */
                    $scope.cancelEdit = function() {
                        // Asetetaan kuvan tiedot alkuperäisiin arvoihin
                        for ( var property in $scope.original) {
                            if ($scope.image.hasOwnProperty(property)) {
                                $scope.image[property] = angular.copy($scope.original[property]);
                            }
                        }
                        $scope.edit = false;
                    };

                    /*
                     * Readonly / edit mode.
                     */
                    $scope.editMode = function() {
                        $scope.edit = true;


						$timeout(function() {
	                        $rootScope.$broadcast('mip-linkitys', {
	                        	mode : 'kuva',
	                        	entityId : $scope.image.properties.id,
	                        	nayteCount : $scope.image.properties.naytteet.length,
	                        	loytoCount : $scope.image.properties.loydot.length,
	                        	yksikkoCount : $scope.image.properties.yksikot.length
	                        });
						},100);
                    };

                    /*
                     * Save changes
                     */
                    $scope.save = function() {
                        // Modify the date format
                          if ($scope.image.properties.kuvauspvm && angular.isDate($scope.image.properties.kuvauspvm)) {
                            var datetime = $scope.image.properties.kuvauspvm;

                            var dateString = datetime.getFullYear() + "-" + (datetime.getMonth() + 1) + "-" + datetime.getDate() + " " + datetime.getHours() + ":" + datetime.getMinutes() + ":" + datetime.getSeconds();
                            $scope.image.properties.kuvauspvm = dateString;
                        } else if ($scope.image.properties.kuvauspvm) {
                            var kuvaus = $scope.image.properties.kuvauspvm.split(' ');

                            //Try to generate date object from the date

                            var datePart = kuvaus[0].split('-');

                            var yyyy = datePart[0];
                            var mm = datePart[1];

                            if(mm.length < 2) {
                                mm = '0' + mm;
                            }

                            var dd = datePart[2];

                            if(dd.length < 2) {
                                dd = '0' + dd;
                            }

                            var timePart = kuvaus[1].split(":");

                            var hh = timePart[0];

                            if(hh.length < 2) {
                                hh = '0' + hh;
                            }

                            var min = timePart[1];

                            if(min.length < 2) {
                                min = '0' + min;
                            }

                            var ss = timePart[2];

                            if(ss.length < 2) {
                                ss = '0' + ss;
                            }

                            //Decrement month by one, otherwise e.g. Dec (12) will lead to Jan (1) as js dates and months start from 0
                            var datetime = new Date(yyyy, mm-1, dd, hh, min, ss);
                            //Increment month by one, otherwise the datestring month will be one less than expected as getMonth() returns months from 0 to 11
                            var dateString = datetime.getFullYear() + "-" + (datetime.getMonth()+1) + "-" + datetime.getDate() + " " + datetime.getHours() + ":" + datetime.getMinutes() + ":" + datetime.getSeconds();
                            $scope.image.properties.kuvauspvm = dateString;
                        }

                        FileService.saveArkImage($scope.image).then(function(id) {
                            $scope.edit = false;

                            // "update" the original after successful save
                            $scope.original = angular.copy($scope.image);
                            /*
                             * Broadcast the modified data to scopes
                             */
                            $rootScope.$broadcast('arkKuva_modified', {});
                        }, function error(data) {
                            locale.ready('common').then(function() {
                                AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                            });
                        });
                    };

                    /*
                     * Maximize or restore the modal
                     */
                    $scope.resize = function() {
                        $scope.resizeIcon = ModalService.toggleFullScreen($scope.resizeIcon);
                    };

                    /*
                     * Delete
                     */
                    $scope.deleteImage = function(modalNameId) {
                        var conf = confirm(locale.getString('common.Confirm_delete2', {'item': $scope.image.properties.luettelointinumero !== null ? $scope.image.properties.luettelointinumero : $scope.image.properties.otsikko}) + ' ('+ locale.getString('common.Image').toUpperCase() +')');
                        if (conf) {
                        	var relObjId = $scope.relatedObject.properties !== undefined ? $scope.relatedObject.properties.id : $scope.relatedObject.id;
                            FileService.deleteArkImage($scope.image.properties.id, CONFIG.ENTITY_TYPE_IDS[$scope.entiteetti_tyyppi], relObjId).then(function success() {
                            	locale.ready('common').then(function() {
                                    AlertService.showInfo(locale.getString('common.Image_deleted'));
                                });

                            	/*
                                 * Broadcast the modified data to scopes
                                 */
                                $rootScope.$broadcast('arkKuva_modified', {
                                	'type': 'poisto',
                                	'kuvaId': $scope.image.properties.id
                                	});
                            }, function error(data) {
                                locale.ready('common').then(function() {
                                    AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                                });
                            });
                        }
                    };

                    $rootScope.$on('arkKuva_modified', function(event, data) {
                    	//Jos poistetaan kuva joka on auki, suljetaan ko. dialogi
                		if(data.kuvaId && data.kuvaId === $scope.image.properties.id) {
                			if(data.type && data.type === 'poisto') {
                				$scope.close($scope.modalNameId);
                			}
                		}
                    });

                    $scope.checkUniqueLuettelointinumero = function(ln) {
                    	FileService.isArkKuvaLuettelointinumeroUnique({'luettelointinumero': ln, 'kuvaId': $scope.image.properties.id}).then(function s(data) {
                    		if(data.properties === true) {
								$scope.imageForm.luettelointinumero.$setValidity('kaytossa', true);
								$scope.uniqueLuettelointinumero  = true;
							} else {
								$scope.imageForm.luettelointinumero.$setValidity('kaytossa', false);
								$scope.uniqueLuettelointinumero = false;
							}
                    	}, function e(data) {
                    		AlertService.showError(locale.getString("common.Error"));
                    	});
                    };

                    $scope.avaaLoyto = function(loyto) {
                    	LoytoService.haeLoyto(loyto.id).then(function(l) {
                    		EntityBrowserService.setQuery('loyto', l.properties.id, {'ark_kuva_id': $scope.image.properties.id}, $scope.image.properties.loydot.length, $scope.image.properties.loydot);
    						ModalService.loytoModal(l, false);
    					});
                    };

                    $scope.avaaNayte = function(nayte) {
                    	NayteService.haeNayte(nayte.id).then(function(n) {
                    		EntityBrowserService.setQuery('nayte', n.properties.id, {'ark_kuva_id': $scope.image.properties.id}, $scope.image.properties.naytteet.length, $scope.image.properties.naytteet);
    						ModalService.nayteModal(n, false);
    					});
                    };

                    $scope.avaaYksikko = function(yksikko) {
                    	YksikkoService.haeYksikko(yksikko.id).then(function(y) {
                            EntityBrowserService.setQuery('yksikko', y.properties.id, {'ark_kuva_id': $scope.image.properties.id}, $scope.image.properties.yksikot.length, $scope.image.properties.yksikot);
    						ModalService.yksikkoModal(y, y.properties.tutkimusalue, permissions);
    					});
                    };

                    $scope.avaaKohde = function(kohde) {
                    	KohdeService.fetchKohde(kohde.id).then(function(k) {
                            EntityBrowserService.setQuery('kohde', k.properties.id, {'ark_kuva_id': $scope.image.properties.id}, $scope.image.properties.kohteet.length, $scope.image.properties.kohteet);
    						ModalService.kohdeModal(k);
    					});
                    };
                }
        ]);