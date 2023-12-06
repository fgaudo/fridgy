import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

typedef ExecuteReader<ENV> = ReaderIO<ENV, void> Function(
  String query,
  List<dynamic>? params,
);

typedef Execute = IO<void> Function(
  String query,
  List<dynamic>? params,
);
