/*
 * Service for handling the rakennus CRUD
 */
angular.module('mip.raportti', []);
// eslint-disable-next-line angular/function-type
angular.module('mip.raportti').factory(
  'RaporttiService',
  [
    '$http', '$q', 'CONFIG', 'AlertService', 'ListService', 'locale', 'CacheFactory', 'SessionService', 'UserService', '$interval', '$rootScope', '$filter',
    function ($http, $q, CONFIG, AlertService, ListService, locale, CacheFactory, SessionService, UserService, $interval, $rootScope, $filter) {

      var intervalFrequency = 30000; //Miten usein raportin tilaa pollataan? 10 000 = 1sek, 60 000 = 1min
      var intervals = {}; //Säilöö intervallit jokaiselle raporttipyynnölle jotka ovat vaiheissa.
      var runningReports = {}; //Säilötään raportit jotka ovat vaiheissa - näytetään navbarissa.

      var raporttiServiceFunctions = {
        /*
                 * Lisätään $interval tietylle raportille.
                 */
        addInterval: function (id) {
          var iv = $interval(function () {
            raporttiServiceFunctions.getReportStatus(id);
          }, intervalFrequency);

          var obj = { interval: iv }
          intervals[id] = obj;
        },
        /*
                 * Peruutetaan interval ja poistetaan se listoilta
                 */
        cancelInterval: function (id) {
          //Cancelloidaan interval
          $interval.cancel(intervals[id].interval);
          //Poistetaan avain
          delete intervals[id];
        },
        cancelIntervals: function () {
          for (var interval in intervals) {
            if (intervals.hasOwnProperty(interval)) {
              $interval.cancel(intervals[interval].interval);

            }
          }
          intervals = {};
        },
        /*
                 * Asetetaan / päivitetään ajossa olevien raporttien lista
                 */
        setRunningReport: function (id, rr) {
          runningReports[id] = rr;
        },
        /*
                 * Palauttaa ajossa olevat raportit listan
                 */
        getRunningReports: function () {
          return runningReports;
        },
        /*
                 * Poista ajossa oleva raportti listoilta
                 */
        deleteRunningReport: function (id) {
          delete runningReports[id];
        },
        deleteRunningReports: function () {
          runningReports = {};
        },
        /*
                 * Palauttaa kaikki KÄYTTÄJÄN raportit
                 */
        getRaportit: function () {
          var deferred = $q.defer();
          //Get the userId:
          var userId = UserService.getProperties().user.id;
          if (userId === undefined || userId === null || userId === "") { //TODO: Fiksaa ettei herjaa tule
            deferred.resolve();
            return deferred.promise;
          }

          var url = CONFIG.API_URL + 'raportti/kayttaja/' + userId;
          $http({
            method: 'GET',
            url: url
          }).then(function successCallback(response) {
            //Loopataan kaikki raportit läpi ja jos siellä on rapsoja jotka ovat vaiheissa, tehdään niille interval, jos sellaista ei vielä ole
            for (var i = 0; i < response.data.data.length; i++) {
              var rr = response.data.data[i];

              if (rr.status.id == 0 || rr.status.id == 1 || rr.status.id == 2) { //0 = created, 1 = queued, 2 = running
                if (intervals[rr.id] === undefined) {
                  raporttiServiceFunctions.addInterval(rr.id);
                }

                //Add old reports that are not yet ready to the list
                raporttiServiceFunctions.setRunningReport(rr.id, rr);
              }
            }

            deferred.resolve(response.data.data);
          }, function errorCallback(response) {
            deferred.reject(response);
          });

          deferred.promise.cancel = function () {
            deferred.resolve('Cancelled');
          };

          return deferred.promise;
        },
        /*
                 * Raportin luontimetodi. Raporttityypin mukaan generoidaan parametrit jokaiselle raportille.
                 */
        createRaportti: function (raporttiTyyppi, raportti) {
          var deferred = $q.defer();
          var url = CONFIG.API_URL + 'raportti/';

          /*
                     * Generoidaan raportin parametrit sen mukaan, minkä tyyppinen raportti on.
                     */
          var reportParameters = null;

          switch (raporttiTyyppi) {
            case 'Kiinteistoraportti':
              reportParameters = this.generateKiinteistoraporttiParameters(raportti);
              break;
            case 'Kuntaraportti':
              reportParameters = this.generateKuntaraporttiParameters(raportti);
              break;
            case 'Yhteenvetoraportti':
              reportParameters = this.generateYhteenvetoraporttiParameters(raportti);
              break;
            case 'KohdeRaportti':
              reportParameters = this.generateKohderaporttiParameters(raportti);
              break;
            case 'Alueraportti':
              reportParameters = this.generateAlueraporttiParameters(raportti);
              break;
            case 'Matkaraportti':
              if (raportti.withMap === false) {
                raporttiTyyppi = 'Matkaraportti_ilman_karttaa';
              }
              delete raportti.withMap;
              reportParameters = this.generateMatkaraporttiParameters(raportti);
              break;
            case 'Matkaraporttikooste':
              reportParameters = this.generateMatkaraporttikoosteParameters(raportti);
              break;
            case 'Inventointiprojektiraportti':
              reportParameters = this.generateInventointiprojektiraporttiParameters(raportti);
              break;
            case 'Vuosiraportti':
              reportParameters = this.generateVuosiraporttiParameters(raportti);
              break;
            case 'Loytoraportti':
              reportParameters = this.generateLoytoraporttiParameters(raportti);
              break;
            case 'Loyto_luettelointikortit':
              reportParameters = this.generateLoytoLuettelointikortitParameters(raportti);
              break;
            case 'Nayteluettelo':
              reportParameters = this.generateNayteluetteloParameters(raportti);
              break;
            case 'Karttaluettelo':
              reportParameters = this.generateKarttaluetteloParameters(raportti);
              break;
            case 'Valokuvaluettelo':
              reportParameters = this.generateValokuvaluetteloParameters(raportti);
              break;
            case 'Tarkastusraportti':
              reportParameters = this.generateTarkastusraporttiParameters(raportti);
              break;
            case 'Koriraportti':
              reportParameters = this.generateKoriraporttiParameters(raportti);
              break;
            case 'Loyto_konservointiraportti':
              reportParameters = this.generateLoytoKonservointiraporttiParameters(raportti);
              break;
            case 'Kuntoraportti':
              reportParameters = this.generateKuntoraporttiParameters(raportti);
              break;
            case 'Tutkimusraportti':
              reportParameters = this.generateTutkimusraporttiParameters(raportti);
              break;
            default:
              /*
                             * Jos raportin parametreja ei ole, raporttia ei voida tehdä
                             */
              var data = { 'message': locale.getString('error.Report_parameters_missing') };
              deferred.reject(data);
              return deferred.promise;
          }

          var data = {
            'tyyppi': raporttiTyyppi,
            'parameters': reportParameters
          };

          $http({
            method: 'POST',
            url: url,
            data: data
          }).then(function success(response) {
            raporttiServiceFunctions.addInterval(response.data.data.id);
            raporttiServiceFunctions.setRunningReport(response.data.data.id, response.data.data);

            $rootScope.$broadcast('Update_data', {
              'type': 'raportti'
            });

            deferred.resolve(response);
          }, function error(response) {
            deferred.reject(response);
          });
          return deferred.promise;
        },
        /*
                 * Parsitaan Kiinteistöraportille välitettävät parametrit
                 */
        generateKiinteistoraporttiParameters: function (raportti) {
          var valitutKentat = [];
          for (var i = 0; i < raportti.valitutKentat.length; i++) {
            valitutKentat.push(raportti.valitutKentat[i].name);
          }

          var paikkakunnat = [];
          for (var i = 0; i < raportti.paikkakuntaSelections.length; i++) {
            paikkakunnat.push(raportti.paikkakuntaSelections[i].value);
          }

          var kylat = [];
          for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
            //Jos on kylä, valitaan kyla id, jos pelkkä kunta, valitaan kunta id
            if (raportti.kylaKuntaSelections[i].kyla) {
              kylat.push(raportti.kylaKuntaSelections[i].kyla.id);
            }
          }

          var kunnat = [];
          for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
            //Pelkat kunnat
            if (!raportti.kylaKuntaSelections[i].kyla) {
              if (raportti.kylaKuntaSelections[i].kunta) {
                kunnat.push(raportti.kylaKuntaSelections[i].kunta.id);
              }
            }
          }

          return {
            'kunnat': kunnat,
            'kylat': kylat,
            'paikkakunnat': paikkakunnat,
            'valitutKentat': valitutKentat,
            'requestedOutputType': 'EXCEL', //Ainoa muoto jossa tämän raportin saa
            'tyyppi': 'Kiinteistoraportti',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        /*
                 * Parsitaan Kuntaraportille välitettävät parametrit
                 */
        generateKuntaraporttiParameters: function (raportti) {
          var valitutKentat = [];
          for (var i = 0; i < raportti.valitutKentat.length; i++) {
            valitutKentat.push(raportti.valitutKentat[i].name);
          }

          var kylat = [];
          for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
            //Jos on kylä, valitaan kyla id, jos pelkkä kunta, valitaan kunta id
            if (raportti.kylaKuntaSelections[i].kyla) {
              kylat.push(raportti.kylaKuntaSelections[i].kyla.id);
            }
          }

          var kunnat = [];
          for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
            //Pelkat kunnat
            if (!raportti.kylaKuntaSelections[i].kyla) {
              if (raportti.kylaKuntaSelections[i].kunta) {
                kunnat.push(raportti.kylaKuntaSelections[i].kunta.id);
              }
            }
          }

          return {
            'kunnat': kunnat,
            'kylat': kylat,
            'paikkakunta': raportti.paikkakunta,
            'valitutKentat': valitutKentat,
            'requestedOutputType': 'EXCEL', //Ainoa muoto jossa tämän raportin saa
            'tyyppi': 'Kuntaraportti',
            'laji': raportti.laji, //Kiinteistöt, rakennukset, alueet, arvoalueet
            'reportDisplayName': raportti.reportDisplayName
          };
        },

        /*
                 * Parsitaan Yhteenvetoraportille välitettävät parametrit
                 */
        generateYhteenvetoraporttiParameters: function (raportti) {
          /*
                    var valitutKentat = [];
                    for(var i = 0; i<raportti.valitutKentat.length; i++) {
                        valitutKentat.push(raportti.valitutKentat[i].name);
                    }

                    var paikkakunnat = [];
                    for(var i = 0; i<raportti.paikkakuntaSelections.length; i++) {
                        paikkakunnat.push(raportti.paikkakuntaSelections[i].value);
                    }
                    */

          var kylat = [];
          var kunnat = [];
          var inventointiprojekti_id = null;

          //Jos inventointiprojekti on valittu, tehdään raportti inventointiprojektin mukaan,
          //muutoin tehdään kunnan (ja kylien) perusteella
          if (raportti.inventointiprojektiselection && raportti.inventointiprojektiselection.id) {
            inventointiprojekti_id = raportti.inventointiprojektiselection.id;
          } else {
            for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
              //Jos on kylä, valitaan kyla id, jos pelkkä kunta, valitaan kunta id
              if (raportti.kylaKuntaSelections[i].kyla) {
                kylat.push(raportti.kylaKuntaSelections[i].kyla.id);
              }
            }

            for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
              //Pelkat kunnat
              if (!raportti.kylaKuntaSelections[i].kyla) {
                if (raportti.kylaKuntaSelections[i].kunta) {
                  kunnat.push(raportti.kylaKuntaSelections[i].kunta.id);
                }
              }
            }

            if (kunnat.length == 0) {
              kunnat[0] = raportti.kylaKuntaSelections[0].kunta.id
            }
          }



          return {
            'kunta': kunnat[0], //Tässä raportissa kuntia voi olla vain 1 kpl
            'kylat': kylat,
            'inventointiprojekti_id': inventointiprojekti_id,
            //'paikkakunnat': paikkakunnat,
            //'valitutKentat': valitutKentat,
            'requestedOutputType': 'PDF', //Ainoa muoto jossa tämän raportin saa(?)
            'tyyppi': 'Yhteenvetoraportti',
            //'laji': raportti.laji, //Kiinteistöt, rakennukset, alueet, arvoalueet
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        /*
                 * Parsitaan Kohderaportille menevät parametrit
                 */
        generateKohderaporttiParameters: function (raportti) {
          return {
            'kiinteisto_id': raportti.kiinteistoId,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Kohderaportti',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        /*
                 * Parsitaan Alueraportille menevät parametrit
                 */
        generateAlueraporttiParameters: function (raportti) {
          return {
            'alue_id': raportti.alueId,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Alueraportti',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        /*
                 * Parsitaan Matkaraportille menevät parametrit
                 */
        generateMatkaraporttiParameters: function (raportti) {
          return {
            'matkaraportti_id': raportti.matkaraporttiId,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Matkaraportti',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        /*
                 * Parsitaan Matkaraporttikoosteelle välitettävät parametrit
                 */
        generateMatkaraporttikoosteParameters: function (raportti) {
          var obj = {
            'requestedOutputType': 'EXCEL', //Ainoa muoto jossa tämän raportin saa
            'tyyppi': 'Matkaraporttikooste',
            'reportDisplayName': raportti.reportDisplayName,
            'report_name': raportti.report_name
          };

          if (raportti.kiinteisto_id) {
            obj['kiinteisto_id'] = raportti.kiinteisto_id;
          }
          if (raportti.kayttaja_id) {
            obj['kayttaja_id'] = raportti.kayttaja_id;
          }
          if (raportti.matkapaiva_alku) {
            obj['matkapaiva_alku'] = raportti.matkapaiva_alku;
          }
          if (raportti.matkapaiva_loppu) {
            obj['matkapaiva_loppu'] = raportti.matkapaiva_loppu;
          }
          var valitutKentat = [];
          for (var i = 0; i < raportti.valitutKentat.length; i++) {
            valitutKentat.push(raportti.valitutKentat[i].name);
          }
          if (valitutKentat.length > 0) {
            obj['valitutKentat'] = valitutKentat;
          }
          if (raportti.syyt && raportti.syyt.length > 0) {
            obj['syyt'] = raportti.syyt;
          }

          return obj;
        },
        /*
                 * Parsitaan Loytoraportille menevät parametrit
                 */
        generateLoytoraporttiParameters: function (raportti) {
          return {
            'tutkimus_id': raportti.tutkimusId,
            'mode': raportti.mode,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Loytoraportti',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        generateNayteluetteloParameters: function (raportti) {
          var naytekoodi = ''; // Näytekoodi, joka määrittää raportille haettavat näytteet tyypin mukaan
          if (raportti.mode === 'maanayteluettelo') {
            naytekoodi = 'MN';
          } else if (raportti.mode === 'rakennefragmenttiluettelo') {
            naytekoodi = 'RF';
          } else if (raportti.mode === 'ajoitusnayteluettelo') {
            naytekoodi = 'AN';
          } else if (raportti.mode === 'luuluettelo') {
            naytekoodi = 'LN';
          }
          return {
            'tutkimusId': raportti.tutkimusId,
            'naytekoodi': naytekoodi,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Nayteluettelo',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        generateKarttaluetteloParameters: function (raportti) {
          return {
            'tutkimusId': raportti.tutkimusId,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Karttaluettelo',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        generateValokuvaluetteloParameters: function (raportti) {
          return {
            'tutkimusId': raportti.tutkimusId,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Nayteluettelo',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        /*
                 * Parsitaan luettelointikorttiraportille menevät parametrit
                 */
        generateLoytoLuettelointikortitParameters: function (raportti) {
          return {
            'loyto_idt': raportti.loyto_idt,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Loyto_luettelointikortit',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        /*
                 * Parsitaan Inventointiprojektiraportille menevät parametrit
                 */
        generateInventointiprojektiraporttiParameters: function (raportti) {
          var ret = {
            'inventointiprojekti_id': raportti.inventointiprojektiselection.id,
            'requestedOutputType': 'EXCEL', //Ainoa muoto jossa tämän raportin saa
            'tyyppi': 'Inventointiprojektiraportti',
            'reportDisplayName': raportti.reportDisplayName,
            'laji': raportti.laji, //Kiinteistöt, rakennukset, alueet, arvoalueet
          }

          if (raportti.inventointiaika_aloitus) {
            var a = raportti.inventointiaika_aloitus;
            ret['inventointipaiva_alku'] = a;
          }
          if (raportti.inventointiaika_lopetus) {
            var l = raportti.inventointiaika_lopetus;
            ret['inventointipaiva_loppu'] = l;
          }

          var valitutKentat = [];
          for (var i = 0; i < raportti.valitutKentat.length; i++) {
            valitutKentat.push(raportti.valitutKentat[i].name);
          }
          if (valitutKentat.length > 0) {
            ret['valitutKentat'] = valitutKentat;
          }

          return ret;
        },
        /*
                 * Parsitaan Vuosiraportille menevät parametrit
                 */
        generateVuosiraporttiParameters: function (raportti) {
          var ret = {
            'requestedOutputType': 'EXCEL', //Ainoa muoto jossa tämän raportin saa
            'tyyppi': 'Inventointiprojektiraportti',
            'reportDisplayName': raportti.reportDisplayName,
            'laji': raportti.laji, //Kiinteistöt, rakennukset, alueet, arvoalueet
          }

          if (raportti.pvm_alku) {
            var a = raportti.pvm_alku;
            ret['pvm_alku'] = a;
          }
          if (raportti.pvm_loppu) {
            var l = raportti.pvm_loppu;
            ret['pvm_loppu'] = l;
          }

          var kylat = [];
          for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
            //Jos on kylä, valitaan kyla id, jos pelkkä kunta, valitaan kunta id
            if (raportti.kylaKuntaSelections[i].kyla) {
              kylat.push(raportti.kylaKuntaSelections[i].kyla.id);
            }
          }

          var kunnat = [];
          for (var i = 0; i < raportti.kylaKuntaSelections.length; i++) {
            //Pelkat kunnat
            if (!raportti.kylaKuntaSelections[i].kyla) {
              if (raportti.kylaKuntaSelections[i].kunta) {
                kunnat.push(raportti.kylaKuntaSelections[i].kunta.id);
              }
            }
          }

          ret['kunnat'] = kunnat;
          ret['kylat'] = kylat;
          ret['paikkakunta'] = raportti.paikkakunta;

          var valitutKentat = [];
          for (var i = 0; i < raportti.valitutKentat.length; i++) {
            valitutKentat.push(raportti.valitutKentat[i].name);
          }
          if (valitutKentat.length > 0) {
            ret['valitutKentat'] = valitutKentat;
          }

          return ret;
        },
        /*
                 * Koriraportille välitettävät parametrit
                 */
        generateKoriraporttiParameters: function (raportti) {
          var valitutKentat = [];
          for (var i = 0; i < raportti.valitutKentat.length; i++) {
            valitutKentat.push(raportti.valitutKentat[i].name);
          }
          return {
            'valitutKentat': valitutKentat,
            'requestedOutputType': 'EXCEL', //Ainoa muoto jossa tämän raportin saa
            'tyyppi': 'Koriraportti',
            'laji': raportti.laji, //Kiinteistöt, rakennukset, alueet, arvoalueet, löydöt, näytteet
            'reportDisplayName': raportti.reportDisplayName,
            'koriId': raportti.koriId
          };
        },
        /*
                 * Parsitaan Loytoraportille menevät parametrit
                 */
        generateTarkastusraporttiParameters: function (raportti) {
          return {
            'tutkimus_id': raportti.tutkimusId,
            'mode': raportti.mode,
            'requestedOutputType': raportti.requestedOutputType,
            'tyyppi': 'Tarkastusraportti',
            'reportDisplayName': raportti.reportDisplayName
          };
        },
        generateLoytoKonservointiraporttiParameters: function (raportti) {
          return {
            'loytoId': raportti.loytoId,
            'requestedOutputType': raportti.requestedOutputType,
            'reportDisplayName': raportti.reportDisplayName,
            'kons_toimenpiteet': raportti.valitutToimenpiteet
          };
        },
        generateKuntoraporttiParameters: function (raportti) {
          return {
            'kuntoraporttiId': raportti.kuntoraporttiId,
            'requestedOutputType': raportti.requestedOutputType,
            'reportDisplayName': raportti.reportDisplayName,
            'konservaattori': raportti.konservaattori
          }
        },
        generateTutkimusraporttiParameters: function (raportti) {
          return {
            'tutkimusraporttiId': raportti.tutkimusraporttiId,
            'requestedOutputType': raportti.requestedOutputType,
            'reportDisplayName': raportti.reportDisplayName,
            'laji': raportti.laji
          }
        },
        /*
                 * Raportin poistaminen
                 */
        deleteReport: function (reportId) {
          var deferred = $q.defer();

          var url = CONFIG.API_URL + 'raportti/' + reportId;
          $http({
            method: 'DELETE',
            url: url
          }).then(function successCallback(response) {
            deferred.resolve(response.data);
          }, function errorCallback(response) {
            deferred.reject(response);
          });

          return deferred.promise;
        },
        /*
                 * Raportin tiedoston lataaminen. Palautetaan URL tiedostoon.
                 */
        downloadReport: function (reportRequest) {
          var filename = $filter('mipOutputFilename')(reportRequest.outputFile);

          // Generate the url and add the auth token to the url
          var url = CONFIG.API_URL + 'raportti/' + reportRequest.id + "/lataus" + '?filename=' + filename;
          url += '&token=' + SessionService.get('token');
          // Open the url
          window.open(url, '_self');
        },
        /*
                 * Haetaan yhden raportin tila. Poistetaan interval ja päivitetään ajossa olevien raporttien tila, jos raporttipyyntö on prosessoitu.
                 */
        getReportStatus: function (reportId) {
          var deferred = $q.defer();

          var url = CONFIG.API_URL + 'raportti/' + reportId + "/tila";
          $http({
            method: 'GET',
            url: url
          }).then(function successCallback(response) {

            /*
                         * Kun raportti valmistuu tai menee virheeseen,
                         *  - poista interval (statusta ei enää tarvi pollata)
                         *  - päivitä navbarin status
                         *  - näytä käyttäjälle ilmoitusnotifikaatio
                         */
            if (response.data.data.status.id == 3) { //Valmis
              raporttiServiceFunctions.cancelInterval(response.data.data.id);
              raporttiServiceFunctions.setRunningReport(response.data.data.id, response.data.data);
              locale.ready('common').then(function () {
                AlertService.showInfo(locale.getString('common.Report_is_ready', { reportName: $filter('mipReportDisplayName')(response.data.data.parameters) }));
              });
            } else if (response.data.data.status.id == 4) { //Virhe
              raporttiServiceFunctions.cancelInterval(response.data.data.id);
              raporttiServiceFunctions.deleteRunningReport(response.data.data.id);
              locale.ready('common').then(function () {
                AlertService.showInfo(locale.getString('common.Report_failed', { reportName: $filter('mipReportDisplayName')(response.data.data.parameters) }));
              });
            }

            //Broadcast information about changes in the list data
            $rootScope.$broadcast('Update_data', {
              'type': 'raportti'
            });

            deferred.resolve(response.data);
          }, function errorCallback(response) {
            deferred.reject(response);
          });

          return deferred.promise;
        }
      }
      return raporttiServiceFunctions;
    }]);