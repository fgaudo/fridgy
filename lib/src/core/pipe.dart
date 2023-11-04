import 'dart:async';

import 'package:rxdart/rxdart.dart';

final class Pipe<A, B> {
  Pipe({
    required Subject<A> subject,
    required StreamTransformer<A, B> transformer,
  })  : _subject = subject,
        stream = subject.transform(transformer);

  final Stream<B> stream;

  void add(A a) {
    if (_subject.isClosed) {
      return;
    }
    _subject.add(a);
  }

  void close() {
    _subject.close();
  }

  final Subject<A> _subject;
}
