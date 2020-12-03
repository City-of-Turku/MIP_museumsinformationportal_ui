/*
 * Service for handling files and images.
 */
angular.module('mip.file', []);

angular.module('mip.file').factory('FileService', [
        '$http', '$q', 'CONFIG', 'ListService', 'AlertService', 'Upload', '$timeout', 'locale', '$rootScope', function($http, $q, CONFIG, ListService, AlertService, Upload, $timeout, locale, $rootScope) {
            return {
                /*
                 * Fetches the images from the backend with the given search words (100kpl)
                 */
                getImages : function(params) {
                    var queryString = ListService.parseQueryString(params);
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + 'kuva/' + queryString;

                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                getArkImages : function(params) {
                    var queryString = ListService.parseQueryString(params);
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + 'ark_kuva/' + queryString;

                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    deferred.promise.cancel = function () {
                        deferred.resolve('Cancelled');
                    };

                    return deferred.promise;
                },

                searchArkImages : function(params) {
                    var queryString = ListService.parseQueryString(params);
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + 'ark_kuva/hae/' + queryString;
                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                getFiles : function(params) {
                    var queryString = ListService.parseQueryString(params);
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + 'tiedosto/' + queryString;

                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                getArkFiles : function(params) {
                    var queryString = ListService.parseQueryString(params);
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + 'tiedosto/ark/' + queryString;

                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                getArkImage : function(id) {
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + "ark_kuva/" + id;
                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                getFile : function(id) {
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + "tiedosto/" + id;
                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                saveImage : function(tiedosto, tiedot, entiteettiTyyppi, entiteettiId) {
                    /*
                     * When a new image is uploaded, we have the tiedot. When an existing image is modified, we do not have tiedot.
                     */
                    var deferred = $q.defer();

                    if (!tiedot) {
                        // Existing image--> update properties
                        $http({
                            method : 'PUT',
                            url : CONFIG.API_URL + 'kuva/' + tiedosto.properties.id,
                            data : tiedosto.properties
                        }).then(function success(response) {
                            deferred.resolve(tiedosto.properties.id);
                        }, function error(response) {
                            deferred.reject(response.data);
                        });
                    } else {
                        tiedosto.upload = Upload.upload({
                            url : CONFIG.API_URL + "kuva/",
                            data : {
                                otsikko : tiedot.otsikko,
                                kuvaus : tiedot.kuvaus,
                                kuvaaja : tiedot.kuvaaja,
                                pvm_kuvaus : tiedot.pvm_kuvaus,
                                entiteetti_tyyppi : entiteettiTyyppi,
                                entiteetti_id : entiteettiId,
                                tiedosto : tiedosto
                            }
                        });

                        tiedosto.upload.then(function(response) {
                            $timeout(function() {
                                tiedosto.result = response.data;
                                deferred.resolve(response.data);
                            });
                        }, function(response) {
                            deferred.reject(response);
                        });
                    }
                    return deferred.promise;
                },
                saveArkImage : function(tiedosto, tiedot, entiteettiTyyppi, entiteettiId, luetteloi, tutkimusId) { //Käytössä
                    /*
                     * When a new image is uploaded, we have the tiedot. When an existing image is modified, we do not have tiedot.
                     */
                    var deferred = $q.defer();

                    if (!tiedot) {
                        // Existing image--> update properties
                        $http({
                            method : 'PUT',
                            url : CONFIG.API_URL + 'ark_kuva/' + tiedosto.properties.id,
                            data : tiedosto.properties
                        }).then(function success(response) {
                            deferred.resolve(tiedosto.properties.id);
                        }, function error(response) {
                            deferred.reject(response.data);
                        });
                    } else {
                        tiedosto.upload = Upload.upload({
                            url : CONFIG.API_URL + "ark_kuva/",
                            data : {
                                kuvaus : tiedot.kuvaus,
                                kuvaaja : tiedot.kuvaaja,
                                kuvauspvm : tiedot.kuvauspvm,
                                entiteetti_tyyppi : entiteettiTyyppi,
                                entiteetti_id : entiteettiId,
                                tiedosto : tiedosto,
                                luetteloi : luetteloi,
                                ark_tutkimus_id : tutkimusId,
                                otsikko : tiedot.otsikko
                            }
                        });

                        tiedosto.upload.then(function(response) {
                            $timeout(function() {
                                tiedosto.result = response.data;
                                deferred.resolve(response.data);
                            });
                        }, function(response) {
                            deferred.reject(response);
                        });
                    }
                    return deferred.promise;
                },
                reorderImages : function(imageIds, entiteettiId, entiteettiTyyppiId) {
                    var url = CONFIG.API_URL + 'kuva/jarjestele';
                    var deferred = $q.defer();

                    if (imageIds.length > 0) {
                        $http({
                            method : 'POST',
                            url : url,
                            data : {
                                "idt" : imageIds,
                                "entiteetti_id" : entiteettiId,
                                "entiteetti_tyyppi_id" : entiteettiTyyppiId
                            }
                        }).then(function success(response) { // Does not return any data.
                            deferred.resolve(response.data);
                        }, function error(data) {
                            deferred.reject(data);
                        });
                    } else {
                        deferred.resolve('noreload');
                    }

                    return deferred.promise;
                },
                saveFile : function(tiedosto, tiedot, entiteettiTyyppi, entiteettiId) {
                    var deferred = $q.defer();

                    if (!tiedot) {
                        // Existing image--> update properties
                        $http({
                            method : 'PUT',
                            url : CONFIG.API_URL + 'tiedosto/' + tiedosto.properties.id,
                            data : tiedosto.properties
                        }).then(function success(response) {
                            deferred.resolve(tiedosto.properties.id);
                        }, function error(response) {
                            deferred.reject(response.data);
                        });
                    } else {
                        tiedosto.upload = Upload.upload({
                            url : CONFIG.API_URL + "tiedosto/",
                            data : {
                                otsikko : tiedot.otsikko,
                                kuvaus : tiedot.kuvaus,
                                tiedosto : tiedosto,
                                entiteetti_tyyppi : entiteettiTyyppi,
                                entiteetti_id : entiteettiId
                            },
                        });

                        tiedosto.upload.then(function(response) {
                            $timeout(function() {
                                tiedosto.result = response.data;
                                deferred.resolve(response.data);
                            });
                        }, function(response) {
                            deferred.reject(response);
                        });
                    }
                    return deferred.promise;
                },
                saveArkFile : function(tiedosto, tiedot, entiteettiTyyppi, entiteettiId, mode, tutkimusId) {
                    var deferred = $q.defer();

                    if (!tiedot) {
                        // Existing image--> update properties
                        $http({
                            method : 'PUT',
                            url : CONFIG.API_URL + 'tiedosto/ark/' + tiedosto.properties.id,
                            data : tiedosto.properties
                        }).then(function success(response) {
                            deferred.resolve(tiedosto.properties.id);
                        }, function error(response) {
                            deferred.reject(response.data);
                        });
                    } else {
                        tiedosto.upload = Upload.upload({
                            url : CONFIG.API_URL + "tiedosto/ark/",
                            data : {
                                otsikko : tiedot.otsikko,
                                kuvaus : tiedot.kuvaus,
                                tiedosto : tiedosto,
                                entiteetti_tyyppi : entiteettiTyyppi,
                                entiteetti_id : entiteettiId,
                                mode : mode,
                                ark_tutkimus_id : tutkimusId
                            },
                        });

                        tiedosto.upload.then(function(response) {
                            $timeout(function() {
                                tiedosto.result = response.data;
                                deferred.resolve(response.data);
                            });
                        }, function(response) {
                            deferred.reject(response);
                        });
                    }
                    return deferred.promise;
                },
                deleteImage : function(id, entityType, entityId) {
                    var deferred = $q.defer();
                    $http({
                        method : 'DELETE',
                        url : CONFIG.API_URL + "kuva/" + id,
                        params : {
                            entiteetti_tyyppi : entityType,
                            entiteetti_id : entityId
                        }
                    }).then(function success(response) {
                        deferred.resolve(response);
                    }, function error(response) {
                        locale.ready('common').then(function success() {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(response));
                        });
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                deleteArkImage : function(id, entityType, entityId) {
                    var deferred = $q.defer();
                    $http({
                        method : 'DELETE',
                        url : CONFIG.API_URL + "ark_kuva/" + id,
                        params : {
                            entiteetti_tyyppi : entityType,
                            entiteetti_id : entityId
                        }
                    }).then(function success(response) {
                        deferred.resolve(response);
                    }, function error(response) {
                        locale.ready('common').then(function success() {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(response));
                        });
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                deleteFile : function(id, entityType, entityId) {
                    var deferred = $q.defer();
                    $http({
                        method : 'DELETE',
                        url : CONFIG.API_URL + "tiedosto/" + id,
                        params : {
                            entiteetti_tyyppi : entityType,
                            entiteetti_id : entityId
                        }
                    }).then(function success(response) {
                        deferred.resolve(response);
                    }, function error(response) {
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                deleteArkFile : function(id, entityType, entityId) {
                    var deferred = $q.defer();
                    $http({
                        method : 'DELETE',
                        url : CONFIG.API_URL + "tiedosto/ark/" + id,
                        params : {
                            entiteetti_tyyppi : entityType,
                            entiteetti_id : entityId
                        }
                    }).then(function success(response) {
                        deferred.resolve(response);
                    }, function error(response) {
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
                linkFile : function(endpoint, mode, object_id, file_id_array, operation) {
                    // Endpoint: The type of object to handle (alue, kiinteisto, rakennus...). Used in the url
                    // Mode: Kuva or Tiedosto. Used in the url.
                    // Object_id: The object to link the files to. Used in the url.
                    // File_id_array: An array of the file or image ids that are to be connected.
                    // Operation: The operation to perform: add or remove. Default is add.

                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + endpoint + "/" + object_id + "/" + mode;
                    var op = '';
                    var data = [];
                    var obj = {
                        'op' : operation,
                        'items' : file_id_array
                    };
                    data.push(obj);

                    if (!operation) {
                        op = 'add';
                    } else {
                        op = operation;
                    }

                    $http({
                        method : 'PATCH',
                        url : url,
                        data : data
                    // OR params: data
                    }).then(function success(response) {
                        deferred.resolve(response);
                    }, function error(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                reorderArkImages : function(imageIds, entiteettiId, entiteettiTyyppiId) {
                    var url = CONFIG.API_URL + 'ark_kuva/jarjestele';

                    $http({
                        method : 'POST',
                        url : url,
                        data : {
                            "idt" : imageIds,
                            "entiteetti_id" : entiteettiId,
                            "entiteetti_tyyppi_id" : entiteettiTyyppiId
                        }
                    });
                },
                linkArkImage : function(obj_id, kuva_idt, ent_tyyppi_id) {
                    var url = CONFIG.API_URL + 'ark_kuva/liita';
                    var deferred = $q.defer();
                    $http({
                        method : 'POST',
                        url : url,
                        data : {
                            "idt" : kuva_idt,
                            "entiteetti_id" : obj_id,
                            "entiteetti_tyyppi_id" : ent_tyyppi_id
                        }
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                getImage : function(imageId) {
                    var url = CONFIG.API_URL + "kuva/" + imageId;
                    var deferred = $q.defer();

                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                moveKuva : function(kuvaId, entiteettiId, entiteettiTyyppiId, palstanumero, inventointinumero, kiinteistotunnus) {
                    var deferred = $q.defer();

                    $http({
                        method : 'PUT',
                        url : CONFIG.API_URL + 'kuva/' + kuvaId + '/siirra',
                        data : {
                            'kiinteistotunnus' : kiinteistotunnus,
                            'palstanumero' : palstanumero,
                            'inventointinumero': inventointinumero,
                            'vanha_entiteetti_id': entiteettiId,
                            'vanha_entiteetti_tyyppi_id': entiteettiTyyppiId
                        }
                    }).then(function success(response) {
                        if(response.data.data.properties.rakennus_id) {
                            $rootScope.$broadcast('Kuva_modified', {
                                'id': response.data.data.properties.rakennus_id
                            });
                        }

                        $rootScope.$broadcast('Kuva_modified', {
                            'id': entiteettiId
                        });

                        $rootScope.$broadcast('Kuva_modified', {
                            'id': response.data.data.properties.kiinteisto_id
                        });

                        $rootScope.$broadcast('Kuva_modified', {
                            'id': kuvaId
                        });

                        $rootScope.$broadcast('Kuvia_siirretty', {
                            'kuvaIdt': [kuvaId]
                        });
                        deferred.resolve(response);
                    }, function error(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                moveKuvat : function(kuvaIdt, entiteettiId, entiteettiTyyppiId, palstanumero, inventointinumero, kiinteistotunnus) {
                    var deferred = $q.defer();

                    $http({
                        method : 'PUT',
                        url : CONFIG.API_URL + 'kuvat/siirra',
                        data : {
                            'kuvaIdt': kuvaIdt,
                            'kiinteistotunnus' : kiinteistotunnus,
                            'palstanumero' : palstanumero,
                            'inventointinumero': inventointinumero,
                            'vanha_entiteetti_id': entiteettiId,
                            'vanha_entiteetti_tyyppi_id': entiteettiTyyppiId
                        }
                    }).then(function success(response) {
                        if(response.data.data.properties.rakennus_id) {
                            $rootScope.$broadcast('Kuva_modified', {
                                'id': response.data.data.properties.rakennus_id
                            });
                        }

                        $rootScope.$broadcast('Kuva_modified', {
                            'id': entiteettiId
                        });

                        $rootScope.$broadcast('Kuva_modified', {
                            'id': response.data.data.properties.kiinteisto_id
                        });

                        $rootScope.$broadcast('Kuvia_siirretty', {
                            'kuvaIdt': kuvaIdt
                        });
                        deferred.resolve(response);
                    }, function error(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                },
                isArkKuvaLuettelointinumeroUnique : function(params) {
                    var queryString = ListService.parseQueryString(params);
                    var deferred = $q.defer();
                    var url = CONFIG.API_URL + 'ark_kuva/uniikkiluettelointinumero/' + queryString;

                    $http({
                        method : 'GET',
                        url : url
                    }).then(function successCallback(response) {
                        deferred.resolve(response.data.data);
                    }, function errorCallback(response) {
                        deferred.reject(response);
                    });

                    return deferred.promise;
                }
            }
        }
]);