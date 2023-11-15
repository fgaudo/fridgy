import 'package:functionally/reader_io.dart';

typedef DeleteFoodsByIds<ENV> = ReaderIO<ENV, void> Function(Set<String> ids);
