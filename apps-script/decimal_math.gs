/** Exact non-negative base-10 arithmetic for Stage 8. No implicit rounding. */

function decimalNormalize_(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('Decimal value must be a display string or number.');
  }
  var text = String(value).trim();
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(text)) {
    throw new Error('Invalid non-negative decimal: ' + text);
  }
  var parts = text.split('.');
  var integer = parts[0].replace(/^0+(?=[0-9])/, '') || '0';
  var fraction = (parts[1] || '').replace(/0+$/, '');
  return fraction ? integer + '.' + fraction : integer;
}


function decimalParts_(value) {
  var normalized = decimalNormalize_(value);
  var split = normalized.split('.');
  return {
    digits: (split[0] + (split[1] || '')).replace(/^0+(?=[0-9])/, '') || '0',
    scale: (split[1] || '').length
  };
}


function decimalFromDigits_(digits, scale) {
  var clean = digits.replace(/^0+(?=[0-9])/, '') || '0';
  if (scale === 0) return decimalNormalize_(clean);
  while (clean.length <= scale) clean = '0' + clean;
  return decimalNormalize_(clean.slice(0, clean.length - scale) + '.' + clean.slice(-scale));
}


function integerAddStrings_(left, right) {
  var i = left.length - 1;
  var j = right.length - 1;
  var carry = 0;
  var output = '';
  while (i >= 0 || j >= 0 || carry) {
    var sum = carry + (i >= 0 ? Number(left.charAt(i--)) : 0) +
      (j >= 0 ? Number(right.charAt(j--)) : 0);
    output = String(sum % 10) + output;
    carry = Math.floor(sum / 10);
  }
  return output.replace(/^0+(?=[0-9])/, '') || '0';
}


function integerMultiplyStrings_(left, right) {
  if (left === '0' || right === '0') return '0';
  var digits = [];
  for (var z = 0; z < left.length + right.length; z++) digits[z] = 0;
  for (var i = left.length - 1; i >= 0; i--) {
    for (var j = right.length - 1; j >= 0; j--) {
      var target = i + j + 1;
      var value = digits[target] + Number(left.charAt(i)) * Number(right.charAt(j));
      digits[target] = value % 10;
      digits[target - 1] += Math.floor(value / 10);
    }
  }
  for (var k = digits.length - 1; k > 0; k--) {
    if (digits[k] >= 10) {
      digits[k - 1] += Math.floor(digits[k] / 10);
      digits[k] %= 10;
    }
  }
  return digits.join('').replace(/^0+(?=[0-9])/, '') || '0';
}


function decimalAdd_(left, right) {
  var a = decimalParts_(left);
  var b = decimalParts_(right);
  var scale = Math.max(a.scale, b.scale);
  var aDigits = a.digits + new Array(scale - a.scale + 1).join('0');
  var bDigits = b.digits + new Array(scale - b.scale + 1).join('0');
  return decimalFromDigits_(integerAddStrings_(aDigits, bDigits), scale);
}


function decimalMultiply_(left, right) {
  var a = decimalParts_(left);
  var b = decimalParts_(right);
  return decimalFromDigits_(integerMultiplyStrings_(a.digits, b.digits), a.scale + b.scale);
}


function decimalScalePower10_(value, exponent) {
  if (!Number.isInteger(exponent)) throw new Error('Decimal scale exponent must be an integer.');
  var parts = decimalParts_(value);
  if (exponent >= 0) {
    if (parts.scale >= exponent) return decimalFromDigits_(parts.digits, parts.scale - exponent);
    return decimalFromDigits_(parts.digits + new Array(exponent - parts.scale + 1).join('0'), 0);
  }
  return decimalFromDigits_(parts.digits, parts.scale - exponent);
}


function decimalSum_(values) {
  return values.reduce(function (total, value) { return decimalAdd_(total, value); }, '0');
}
