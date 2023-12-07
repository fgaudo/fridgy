import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

typedef RetrieveReader<ENV> = ReaderIO<ENV, List<dynamic>> Function(
  String query,
  List<dynamic>? params,
);

typedef Retrieve = IO<List<dynamic>> Function(
  String query,
  List<dynamic>? params,
);
