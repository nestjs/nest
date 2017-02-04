var chai = require('chai');
var chaiSinon = require('sinon-chai');

chai.use(chaiSinon);

var context = require.context('./src/', true, /.spec\.[jt]sx?$/);
context.keys().forEach(context);