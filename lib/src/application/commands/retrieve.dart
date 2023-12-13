import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

typedef RetrieveReader<ENV, T> = ReaderIO<ENV, List<dynamic>> Function(T);

typedef Retrieve<T> = IO<List<dynamic>> Function(T);
