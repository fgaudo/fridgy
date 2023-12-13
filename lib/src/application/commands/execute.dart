import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

typedef ExecuteReader<ENV, T> = ReaderIO<ENV, void> Function(T);

typedef Execute<T> = IO<void> Function(T);
