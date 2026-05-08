import { dict, towerC, provinceNew, cityNew } from './SMSite';
import { parseCsv } from '../../services/fileParsers';

export function extractBaseAndSuffix(nmsString) {
  if (!nmsString) return { cleanBase: '', displayBase: '', suffix: '', suffixSet: new Set() };

  let originalStr = String(nmsString).toUpperCase().trim();
  let displayBase = originalStr;
  let suffixLetters = '';

  const anchors = [
  "DVOC","DVOR","MISOR","MOR","MOCC","MOC","DNGT","CMGN","ZSIB","ZDN",
  "SKUD","MGDN","MGND","SCOT","NCOT","COT","SAR","AGN","LDN","LDS",
  "DDN","SDN","SDS","BUK","DDO","CVLY","AGS","DDS","BAS","SULU",
  "TAWI","ZDS","GENSAN","DAVOR","ADN","BUKDN","SKDRAT","DDM"
  ];

  const noprovanchor = [
    "ADLAY","ASUNSI","AGUSAN","ALEJAL","ALSON","AMAYPACHOSP","BABAK",
    "BAGONTASVALN","BAGTAP","BALANGASAN","BALSIAORLY","BANALEPGDIAN",
    "BANGCUDMALAY","BANGKALPTKUL","BAROY","BGETABIAWAN","BIASONGDIPOL",
    "BINUAN","BLGIAN","BMORET","BNAWAN","BOALAN",
    "BTIBOT","BULUAN","CARRAS","CAMPPH","CAMPUNOLAMIT","CMUSP",
    "CANELR","CANTIL","CAWAY","CAWACAWAPOB","CIUDADMEDCTR",
    "CLARIN","COGONELSLVDR","COLUMB","CONCEPKORDAL","CPTOLSNJOSEDNGTLEGO",
    "DAGATKIDVALN","DAKAK","DANSLR","DARUL","DUGMAN",
    "EBENEZER","EPOL","FALCAT","FMARTK","FUENTEH",
    "GFATIM","GICMAL","GLAMAN","GOVRAM","GPANAB","GVALEN","GTZAMBOFOC",
    "GRINOTACUR","GSILGN","GTAGUM","GUIHIN","HTLGUILLER",
    "IMPAL","INDUST","IPIL","ISLAJARDIN","ISULANCPITOL",
    "JAKART","JASAAN","JDLMAN","KATID","KABAN",
    "KABLACANRLY","KATUBAORLY","KATUNGTACUR","KAURAN","KBASAL",
    "KCCGEN","KCCMARBEL","KISOLN","KLANGANCOTABMGDNLEGO","KPJUAN",
    "LABASO","LABUAN","LAGUIN","LAHAK","LAMCAN",
    "LANTAP","LAUM","LEBAK","LEEPL","LILOY",
    "LINABOMALAY","LLIBER","LONDON","LORENZOTAN","LOWDAN",
    "LUMBO2VALN","LUMBOVALN","LUUK","LUYAHN","MAMASP",
    "MAASIM","MAGPET","MAGSAY","MAGSYM","MAGSAYPOLSCO","MINEVENTNSB",
    "MAKAR","MALAYB","MANINGCOLOZM","MARANT","MARCOSPUTIK",
    "MIDSAL","MLANGAIRPT","MLORET","MMAGSY","MMALIT","MARAWIPOB",
    "MMCOZAMISR","MONCKADMAR","MRAHAN","MTVIEWM","MURICAY","MALINAOSP",
    "MUSUAN","NAAWAN","NORTHPOBMARAM","OLUTAN","ORCHID",
    "P2BAGONTAAS","P24MABUHAY","PAGLAT","PALKAN","PANABO",
    "PANAON","PANPIL","PANTUK","PARIAN","PERSIN",
    "PIGKAW","PINAN","PIPOL","POBPANGAN","POBPARSUL",
    "POBPIL","POBPREROXAS","POLODAP","PSCMIN","PTINAY",
    "PUTIK","QUEZON","QUIRIN","RBAGSA","RCARAS",
    "RCOLMB","RGLAN","RJDALM","RKALIL","RLBUAN",
    "RMAHAY","RMALIT","ROBGEN","ROBILIGAN1ID","ROBILIGAN2ID",
    "RPARAN","RSCLAR","RSNFER","RTALTAKGLAN","RTOMAR",
    "RTUBUR","SALAY","SANGA2AIRPT","SANJOSMALAYB","SIAY","SANTONIOTITAYZS",
    "SIOCON","SITANK","SMCBUTUAN1ID","SMCBUTUAN2ID","SMCKILIWST",
    "SMGEN","STAMARIARLY","STCLAR","STHSQR","STMARIPGDIAN",
    "STONIN","SUBIAN","SULIT","SURALL","SYDNEYHOTEL","SAGONSONGAN",
    "TAGLATAWAN","TALISY","TALITAY","TAMBER","TAMBUL",
    "TAMPAK","TAMPAR","TAMPIL","TANDAGAIRPT","TANDUB",
    "TANTAN","TAVIRAN","TBURAN","TETUAN","TIGBAW",
    "TITAY","TOPLAH","TUBRAN","TUGBUN","TUKARLY",
    "TUKASKUD","TUNGAW","UCALER","VERANZAMALL","VILLAN",
    "WESMINCOM","ZDNPH"];

  const anchors2nd = ['TEMPO', 'ID', 'AS', '_D', 'COW', 'TEMP', 'EM', '-D', 'OD', 'IO', 'LS', 'LEGO','PH'];

  let matched = false;

  function findBestAnchor(str, anchors) {
  str = str.toUpperCase();

  // longest -> shortest
  const sortedAnchors = [...anchors].sort(
    (a, b) => b.length - a.length
  );

  let bestAnchor = null;
  let bestIndex = -1;

  let bestMatched = null;
  let bestMatchedIndex = -1;
  let bestMatchedLength = -1;

  for (const anchor of sortedAnchors) {
    const upperAnchor = anchor.toUpperCase();
    const idx = str.lastIndexOf(upperAnchor);

    if (idx === -1) continue;

    // FARTHEST-RIGHT MATCH
    if (idx > bestIndex) {
      bestAnchor = anchor;
      bestIndex = idx;
    }

    // LONGEST MATCH
    if (upperAnchor.length > bestMatchedLength) {
      bestMatched = anchor;
      bestMatchedIndex = idx;
      bestMatchedLength = upperAnchor.length;
    }
  }

  return {
    bestAnchor,
    bestIndex,
    bestMatched,
    bestMatchedIndex,
    bestMatchedLength
  };
}

  const firstanchor = findBestAnchor(originalStr, anchors);
  const secondanchor = findBestAnchor(originalStr, noprovanchor);

  let found = false;
  let decisionAnchor = false;

  if (firstanchor.bestAnchor !== null && secondanchor.bestAnchor !== null) {
    if (secondanchor.bestMatchedIndex < firstanchor.bestIndex && secondanchor.bestMatchedLength > firstanchor.bestIndex) {
      decisionAnchor = true;
    }

    if (!decisionAnchor) {
      const anchor = firstanchor.bestAnchor;
      let idx = firstanchor.bestIndex;

      for (const secAnchor of anchors2nd) {
        let secIdx = originalStr.indexOf(secAnchor, idx + anchor.length);

        if (secIdx !== -1) {
          let potentialSuffix = originalStr.slice(
            idx + anchor.length + secAnchor.length
          );

          const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

          if (isValidSuffix) {
            suffixLetters = potentialSuffix;
            displayBase = originalStr.slice(
              0,
              secIdx + secAnchor.length
            );
            matched = true;
            break;
          } else {
            suffixLetters = "";
            displayBase = originalStr.slice(
              0,
              secIdx + secAnchor.length
            );
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        let potentialSuffix = originalStr.slice(idx + anchor.length);
        const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

        if (isValidSuffix) {
          suffixLetters = potentialSuffix;
          displayBase = originalStr.slice(0, idx + anchor.length);
        } else {
          suffixLetters = "";
          displayBase = originalStr.slice(0, idx + anchor.length);
        }
      }
    } else {
      const anchor = secondanchor.bestMatched;
      let idx = secondanchor.bestMatchedIndex;

      for (const secAnchor of anchors2nd) {
        let secIdx = originalStr.indexOf(secAnchor, idx + anchor.length);

        if (secIdx !== -1) {
          let potentialSuffix = originalStr.slice(
            idx + anchor.length + secAnchor.length
          );

          const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

          if (isValidSuffix) {
            suffixLetters = potentialSuffix;
            displayBase = originalStr.slice(
              0,
              secIdx + secAnchor.length
            );
            found = true;
            break;
          } else {
            suffixLetters = "";
            displayBase = originalStr.slice(
              0,
              secIdx + secAnchor.length
            );
            found = true;
            break;
          }
        }
      }

      if (!found) {
        let potentialSuffix = originalStr.slice(idx + anchor.length);
        const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

        if (isValidSuffix) {
          suffixLetters = potentialSuffix;
          displayBase = originalStr.slice(0, idx + anchor.length);
          found = true;
        } else {
          suffixLetters = "";
          displayBase = originalStr.slice(0, idx + anchor.length);
          found = true;
        }
      }
    }
  }

  else if (firstanchor.bestAnchor !== null && secondanchor.bestMatched === null) {
    const anchor = firstanchor.bestAnchor;
    let idx = firstanchor.bestIndex;

    for (const secAnchor of anchors2nd) {
      let secIdx = originalStr.indexOf(secAnchor, idx + anchor.length);

      if (secIdx !== -1) {
        let potentialSuffix = originalStr.slice(
          idx + anchor.length + secAnchor.length
        );

        const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

        if (isValidSuffix) {
          suffixLetters = potentialSuffix;
          displayBase = originalStr.slice(
            0,
            secIdx + secAnchor.length
          );
          matched = true;
          break;
        } else {
          suffixLetters = "";
          displayBase = originalStr.slice(
            0,
            secIdx + secAnchor.length
          );
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      let potentialSuffix = originalStr.slice(idx + anchor.length);
      const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

      if (isValidSuffix) {
        suffixLetters = potentialSuffix;
        displayBase = originalStr.slice(0, idx + anchor.length);
      } else {
        suffixLetters = "";
        displayBase = originalStr.slice(0, idx + anchor.length);
      }
    }
  }

  else if (secondanchor.bestMatched !== null && firstanchor.bestAnchor === null) {
    const anchor = secondanchor.bestMatched;
    let idx = secondanchor.bestMatchedIndex;

    for (const secAnchor of anchors2nd) {
      let secIdx = originalStr.indexOf(secAnchor, idx + anchor.length);

      if (secIdx !== -1) {
        let potentialSuffix = originalStr.slice(
          idx + anchor.length + secAnchor.length
        );

        const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

        if (isValidSuffix) {
          suffixLetters = potentialSuffix;
          displayBase = originalStr.slice(
            0,
            secIdx + secAnchor.length
          );
          found = true;
          break;
        } else {
          suffixLetters = "";
          displayBase = originalStr.slice(
            0,
            secIdx + secAnchor.length
          );
          found = true;
          break;
        }
      }
    }

    if (!found) {
      let potentialSuffix = originalStr.slice(idx + anchor.length);
      const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

      if (isValidSuffix) {
        suffixLetters = potentialSuffix;
        displayBase = originalStr.slice(0, idx + anchor.length);
        found = true;
      } else {
        suffixLetters = "";
        displayBase = originalStr.slice(0, idx + anchor.length);
        found = true;
      }
    }
  }
  
  else {
    let fallbackMatch = originalStr.match(/([-_ ]*)((?:[XYLFWKHVBMNPRT])+ )$/i);
    if (!fallbackMatch) {
      fallbackMatch = originalStr.match(/([-_ ]*)((?:[XYLFWKHVBMNPRT])+ )$/i); // fallback pattern if needed
    }
    fallbackMatch = originalStr.match(/([-_ ]*)((?:[XYLFWKHVBMNPRT])+)$/i);
    if (fallbackMatch) {
      let separator = fallbackMatch[1];
      let actualSuffix = fallbackMatch[2];
      displayBase = originalStr.slice(0, -fallbackMatch[0].length) + separator;
      suffixLetters = actualSuffix;
    }
  }
  

  let cleanBase = displayBase.replace(/[^A-Z0-9]/g, '');

  return {
    cleanBase,
    displayBase,
    suffix: suffixLetters,
    suffixSet: new Set(suffixLetters.split(''))
  };
}

export function getIndex(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).trim().toUpperCase();
    if (possibleNames.indexOf(h) > -1) return i;
  }
  return -1;
}

export function getCoords(row, latIdx, lngIdx) {
  return {
    lat: latIdx > -1 && row[latIdx] ? row[latIdx] : 7.1905,
    lng: lngIdx > -1 && row[lngIdx] ? row[lngIdx] : 125.4503
  };
}

export function inferLocation(baseName) {
  var name = String(baseName).toUpperCase();
  var result = { city: '', prov: '', area: '' };

  var geoMap = [
    { keys: ['PANABO', 'TADECO'], city: 'PANABO CITY', prov: 'DAVAO DEL NORTE' },
    { keys: ['SAMAL', 'IGACOS'], city: 'ISLAND GARDEN CITY OF SAMAL', prov: 'DAVAO DEL NORTE' },
    { keys: ['TAGUM'], city: 'TAGUM CITY', prov: 'DAVAO DEL NORTE' },
    { keys: ['CARMEN'], city: 'CARMEN', prov: 'DAVAO DEL NORTE' },
    { keys: ['DAVAO', 'DVO', 'ULAS'], city: 'DAVAO CITY', prov: 'DAVAO DEL SUR' },
    { keys: ['DIGOS', 'DDS'], city: 'DIGOS CITY', prov: 'DAVAO DEL SUR' },
    { keys: ['MATI', 'DVOR'], city: 'MATI CITY', prov: 'DAVAO ORIENTAL' },
    { keys: ['KIDAPAWAN', 'KIDAP'], city: 'KIDAPAWAN CITY', prov: 'NORTH COTABATO' },
    { keys: ['COTABATO', 'COTAB'], city: 'COTABATO CITY', prov: 'MAGUINDANAO DEL NORTE' },
    { keys: ['ZAMBOANGA', 'ZAMBOA'], city: 'ZAMBOANGA CITY', prov: 'ZAMBOANGA DEL SUR' },
    { keys: ['GENSAN', 'GSC'], city: 'GENERAL SANTOS CITY', prov: 'SOUTH COTABATO' },
    { keys: ['CDO', 'CAGAYAN'], city: 'CAGAYAN DE ORO CITY', prov: 'MISAMIS ORIENTAL' }
  ];

  for (var i = 0; i < geoMap.length; i++) {
    for (var k = 0; k < geoMap[i].keys.length; k++) {
      if (name.includes(geoMap[i].keys[k])) {
        result.city = geoMap[i].city;
        result.prov = geoMap[i].prov;
        return result;
      }
    }
  }
  return result;
}

export function generateSpecificTechLabel(baseGen, suffixStr) {
  var str = String(suffixStr).toUpperCase();
  var label = baseGen;

  if (baseGen === '4G') {
    var types = [];
    if (/[FLWY]/.test(str)) types.push('');
    if (/H/.test(str)) types.push('');
    if (/V/.test(str)) types.push('');
    if (types.length > 0) label = '4G' + types.join('');
  } else if (baseGen === '5G') {
    var types5g = [];
    if (/M/.test(str)) types5g.push('');
    if (/[PN]/.test(str)) types5g.push('');
    if (types5g.length > 0) label = '5G' + types5g.join('');
  }
  return label;
}

export function generatetechname(udmtech) {
  const techName = {"G1800":'',
                    "G900":'',
                    "L1800":'F',
                    "L700":'L',
                    "L2100":'W',
                    "L900":'Y',
                    "L2600":'H',
                    "L2600 4T4R":'H',
                    "L2300":'K',
                    "L3500":'B',
                    "L2600-MM":'V',
                    "NR35 MM":'M',
                    "NR26 MM":'N',
                    "NR700":'P',
                    "NR26 8T8R":'R',
                    "NR26 4T4R":'R',
                    "NR35 8T8R":'T'}

  var techSuffix = '';
    
  for (let c = 0; c < Object.keys(techName).length; c++) {
    const key = Object.keys(techName)[c];
    if (udmtech.includes(key)) {
      techSuffix += techName[key];
    }
  }

  return techSuffix;
}

export function processCSVComparison(nmsText, udmText) {
  try {
    var nmsData = parseCsv(nmsText);
    var udmData = parseCsv(udmText);

    if (nmsData.length < 2 || udmData.length < 2) {
      throw new Error('File(s) empty.');
    }

    var nmsHeaders = nmsData[0];
    var udmHeaders = udmData[0];

    var udmNameIdx = getIndex(udmHeaders, ['BCF NAME', 'SITE NAME']);
    var udmIdIdx = getIndex(udmHeaders, ['PLA_ID', 'PLA ID']);
    var udmLatIdx = getIndex(udmHeaders, ['LATITUDE', 'LAT']);
    var udmLngIdx = getIndex(udmHeaders, ['LONGITUDE', 'LONG']);
    var udmSAreaIdx = getIndex(udmHeaders, ['ASSIGNED_AREA', 'ASSIGN_AREA', 'ASSIGN AREA', 'ASSIGNED AREA']);
    var udmProIdx = getIndex(udmHeaders, ['PROVINCE']);
    var udmMCtyIdx = getIndex(udmHeaders, ['ASSIGN_CITY/MUNICIPALITY', 'TOWN']);
    var udmSAddIdx = getIndex(udmHeaders, ['SITE_ADDRESS', 'SITE_ADD', 'SITE ADDRESS', 'SITE ADD']);
    var udmTrtIdx = getIndex(udmHeaders, ['TERRITORY']);
    var udmHSvrIdx = getIndex(udmHeaders, ['HIROSHIMA SEVERITY', 'HIROSHIMA_SEVERITY']);
    var udmTechIdx = getIndex(udmHeaders, ['ALL TECH']);
    var udmtwrCIdx = getIndex(udmHeaders, ['TOWERCO', 'TOWERCO NAME (ASCEO)']);

    var nms2GNameIdx = getIndex(nmsHeaders, ['2G', 'NAME']);
    var nms4GNameIdx = getIndex(nmsHeaders, ['4G', 'ENBNAME']);
    var nms5GNameIdx = getIndex(nmsHeaders, ['5G', 'GNBCUNAME']);

    var udmTable = {};
    for (let j = 1; j < udmData.length; j++) {
      if (udmNameIdx === -1) continue;
      if (udmData[j].join('').replace(/,/g, '').trim() === '') continue;

      var rawName = String(udmData[j][udmNameIdx] || '');
      var rawTechName = String(udmData[j][udmTechIdx] || '');
      var grouptechname = rawTechName.split("/");
      var plaId = udmIdIdx > -1 ? String(udmData[j][udmIdIdx] || '').trim() : 'UNKNOWN_ID_' + j;

      var cleanedName = rawName.toUpperCase().replace(/[\s\uFEFF\xA0]/g, '');
      var invalidValues = ['', 'NA', 'NONE', 'NULL', '-'];
      var isInvalidName = invalidValues.includes(cleanedName);
      var originalUdmName = isInvalidName ? 'UNNAMED_SITE_' + plaId : rawName.trim().toUpperCase();

      var parsedUdm = generatetechname(grouptechname);

      var isDuplicateBase = false;
      if (udmTable[originalUdmName]) {
        originalUdmName = originalUdmName + '_DUPLICATE_' + j;
        isDuplicateBase = true;
      }

      var coords = getCoords(udmData[j], udmLatIdx, udmLngIdx);

      udmTable[originalUdmName] = {
        plaId: plaId,
        lat: coords.lat,
        lng: coords.lng,
        originalName: isInvalidName ? cleanedName || 'BLANK' : originalUdmName,
        isGhostSite: isInvalidName,
        isDuplicate: isDuplicateBase,
        allowedSuffixSet: new Set(String(parsedUdm).toUpperCase().split('')),
        sArea: udmSAreaIdx > -1 ? udmData[j][udmSAreaIdx] : '',
        prov: udmProIdx > -1 ? String(udmData[j][udmProIdx] || '').trim().toUpperCase() : '',
        mCity: udmMCtyIdx > -1 ? udmData[j][udmMCtyIdx] : '',
        sAdd: udmSAddIdx > -1 ? udmData[j][udmSAddIdx] : '',
        trt: udmTrtIdx > -1 ? udmData[j][udmTrtIdx] : '',
        hSvr: udmHSvrIdx > -1 ? udmData[j][udmHSvrIdx] : '',
        twrC: udmtwrCIdx > -1 ? udmData[j][udmtwrCIdx] : ''
      };
    }

    var siteGroups = {};

    for (let j = 1; j < nmsData.length; j++) {
      var items = [
        { name: nms2GNameIdx > -1 ? String(nmsData[j][nms2GNameIdx] || '').trim() : '', gen: '2G' },
        { name: nms4GNameIdx > -1 ? String(nmsData[j][nms4GNameIdx] || '').trim() : '', gen: '4G' },
        { name: nms5GNameIdx > -1 ? String(nmsData[j][nms5GNameIdx] || '').trim() : '', gen: '5G' }
      ].filter(i => i.name !== '');

      items.forEach(item => {
        var parsed = extractBaseAndSuffix(item.name);
        var bName = parsed.cleanBase;
        if (!bName) return;

        if (!siteGroups[bName]) {
          siteGroups[bName] = {
            displayBase: parsed.displayBase,
            suffixes: new Set(),
            originalEntries: []
          };
        }

        siteGroups[bName].originalEntries.push({ rawName: item.name, baseGen: item.gen, suffix: parsed.suffix });

        for (let char of parsed.suffix) {
          siteGroups[bName].suffixes.add(char.toUpperCase());
        }
      });
    }

    var report = [];
    var matchedUdmKeys = new Set();

    for (var bName in siteGroups) {
      var group = siteGroups[bName];
      var udmRowMatch = udmTable[bName];

      var status = 'NEW';
      var remarks = 'Synthesized from NMS.';
      var inferredLocation = udmRowMatch ? null : inferLocation(group.displayBase);

      if (udmRowMatch) {
        matchedUdmKeys.add(bName);

        var nmsSet = group.suffixes;
        var udmSet = udmRowMatch.allowedSuffixSet;

        var isSameSize = nmsSet.size === udmSet.size;
        var hasAll = Array.from(nmsSet).every(char => udmSet.has(char));

        if (isSameSize && hasAll) {
          status = 'UNCHANGED';
          remarks = 'Site BCF validated perfectly against UDM.';
        } else {
          status = 'MISMATCH';
          remarks = `NMS TECHNOLOGIES: [${Array.from(group.suffixes).join(', ')}] | UDM TECHNOLOGIES: [${Array.from(udmRowMatch.allowedSuffixSet).join(', ')}].`;
        }
      }

      group.originalEntries.forEach(entry => {
        var specificTechLabel = generateSpecificTechLabel(entry.baseGen, entry.suffix);

        report.push({
          plaId: udmRowMatch ? udmRowMatch.plaId : 'NEW_SITE',
          matchStatus: status,
          techName: entry.rawName,
          baseLocation: group.displayBase,
          techGen: specificTechLabel,
          nmsName: entry.rawName,
          lat: udmRowMatch ? udmRowMatch.lat : '',
          lng: udmRowMatch ? udmRowMatch.lng : '',
          sArea: udmRowMatch ? udmRowMatch.sArea : inferredLocation.area,
          prov: udmRowMatch ? udmRowMatch.prov : provinceNew(entry.rawName),
          mCity: udmRowMatch ? udmRowMatch.mCity : cityNew(entry.rawName),
          sAdd: udmRowMatch ? udmRowMatch.sAdd : '',
          trt: udmRowMatch ? udmRowMatch.trt : '',
          hSvr: udmRowMatch ? udmRowMatch.hSvr : '',
          twrC: udmRowMatch ? udmRowMatch.twrC : towerC(entry.rawName),
          region: dict(udmRowMatch ? udmRowMatch.prov : provinceNew(entry.rawName)),
          remarks: remarks
        });
      });
    }

    for (var udmKey in udmTable) {
      if (!matchedUdmKeys.has(udmKey)) {
        var u = udmTable[udmKey];
        var removedParsed = extractBaseAndSuffix(u.originalName);
        var forceUnique = u.isGhostSite || u.isDuplicate;
        var uniqueDisplayBase = forceUnique ? u.originalName + ' (' + u.plaId + ')' : removedParsed.displayBase;
        
        var baseGen = '2G';
        var str = removedParsed.suffix.toUpperCase();
        if (/[FLWYHV]/.test(str)) {
          baseGen = '4G';
        } else if (/[MPN]/.test(str)) {
          baseGen = '5G';
        }

        var specificTechLabel = generateSpecificTechLabel(baseGen, removedParsed.suffix);

        report.push({
          plaId: u.plaId,
          matchStatus: 'REMOVED',
          techName: forceUnique ? uniqueDisplayBase : u.originalName,
          baseLocation: uniqueDisplayBase,
          techGen: specificTechLabel,
          nmsName: forceUnique ? uniqueDisplayBase : u.originalName,
          lat: u.lat,
          lng: u.lng,
          prov: u.prov,
          remarks: u.isGhostSite ? 'UDM BCF Name was blank/missing.' : (u.isDuplicate ? 'CRITICAL: UDM Database Collision! Multiple PLA_IDs share this exact BCF Name.' : 'Site BCF found in UDM but missing from NMS.'),
          sArea: u.sArea,
          mCity: u.mCity,
          sAdd: u.sAdd,
          trt: u.trt,
          hSvr: u.hSvr,
          twrC: u.twrC,
          region: dict(u.prov)
        });
      }
    }

    return { success: true, data: report, count: report.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
